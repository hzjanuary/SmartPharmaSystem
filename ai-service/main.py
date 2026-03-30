from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
import os
import google.generativeai as genai


class InventoryItem(BaseModel):
    lot_id: Optional[str] = Field(default=None, description="Lot identifier")
    product_id: Optional[int] = Field(default=None, description="Product identifier")
    product_name: str = Field(..., description="Drug name")
    batch_no: Optional[str] = Field(default=None, description="Batch number")
    quantity: int = Field(..., ge=0, description="Remaining stock quantity")
    expiry_date: str = Field(..., description="Expiry date (YYYY-MM-DD or DD/MM/YYYY)")


class RecommendationRequest(BaseModel):
    items: List[InventoryItem]


class RecommendationItem(BaseModel):
    priority: int
    lot_id: Optional[str]
    product_id: Optional[int]
    product_name: str
    batch_no: Optional[str]
    quantity: int
    expiry_date: str
    days_to_expiry: int
    risk_level: str


class RecommendationResponse(BaseModel):
    total_items: int
    recommendations: List[RecommendationItem]


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User message for SPS assistant")


class ChatResponse(BaseModel):
    reply: str


class ChatContextError(RuntimeError):
    pass


MODEL_CANDIDATES = [
    "gemini-1.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
]


def parse_expiry_date(value: str) -> date:
    """Parse common date formats used by FEFO payloads."""
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unsupported date format: {value}")


def get_risk_level(days_to_expiry: int) -> str:
    if days_to_expiry < 0:
        return "EXPIRED"
    if days_to_expiry <= 30:
        return "HIGH"
    if days_to_expiry <= 90:
        return "MEDIUM"
    return "LOW"


def build_recommendations(items: List[InventoryItem]) -> RecommendationResponse:
    today = date.today()

    parsed = []
    for item in items:
        expiry = parse_expiry_date(item.expiry_date)
        days_left = (expiry - today).days
        parsed.append(
            {
                "lot_id": item.lot_id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "batch_no": item.batch_no,
                "quantity": item.quantity,
                "expiry": expiry,
                "days_to_expiry": days_left,
                "risk_level": get_risk_level(days_left),
            }
        )

    parsed.sort(key=lambda row: row["expiry"])

    recommendations: List[RecommendationItem] = []
    for index, row in enumerate(parsed, start=1):
        recommendations.append(
            RecommendationItem(
                priority=index,
                lot_id=row["lot_id"],
                product_id=row["product_id"],
                product_name=row["product_name"],
                batch_no=row["batch_no"],
                quantity=row["quantity"],
                expiry_date=row["expiry"].isoformat(),
                days_to_expiry=row["days_to_expiry"],
                risk_level=row["risk_level"],
            )
        )

    return RecommendationResponse(total_items=len(recommendations), recommendations=recommendations)


def create_db_engine() -> Optional[Engine]:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return None
    return create_engine(database_url, pool_pre_ping=True)


def configure_gemini() -> bool:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return False

    genai.configure(api_key=api_key)
    return True


def resolve_gemini_model_name() -> str:
    preferred_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    available = {
        model.name.replace("models/", "")
        for model in genai.list_models()
        if "generateContent" in getattr(model, "supported_generation_methods", [])
    }

    candidates = [preferred_model] + [name for name in MODEL_CANDIDATES if name != preferred_model]
    for candidate in candidates:
        if candidate in available:
            return candidate

    raise ChatContextError(
        "No compatible Gemini model for generateContent was found for this API key. "
        "Please set GEMINI_MODEL to an available model (for example: gemini-2.5-flash)."
    )


def get_gemini_model() -> genai.GenerativeModel:
    if not configure_gemini():
        raise ChatContextError("GEMINI_API_KEY is not configured for AI service.")

    model_name = resolve_gemini_model_name()

    return genai.GenerativeModel(
        model_name=model_name,
        system_instruction=(
            "Bạn là Trợ lý dược phẩm SPS. "
            "Chỉ trả lời bằng tiếng Việt và Chỉ hỗ trợ các câu hỏi liên quan đến sản phẩm, tồn kho, hạn sử dụng và mã SKU (product_code) có trong hệ thống."
            "Nếu câu hỏi nằm ngoài phạm vi này, hãy từ chối một cách lịch sự và hướng dẫn người dùng quay lại các nghiệp vụ liên quan đến kho dược."
            "Khi cần dữ liệu thực tế, bắt buộc phải gọi công cụ (tool) để đọc dữ liệu từ cơ sở dữ liệu. Tuyệt đối không được tự suy đoán hoặc đưa ra số liệu giả định."
        ),
    )


def normalize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(row)
    expiry = normalized.get("expiry_date")
    if expiry is not None:
        normalized["expiry_date"] = str(expiry)
    return normalized


def get_stock_by_sku(product_code: str) -> Dict[str, Any]:
    if engine is None:
        raise ChatContextError("DATABASE_URL is not configured for AI service.")

    with engine.connect() as conn:
        if engine.dialect.name.startswith("postgres"):
            sql = text(
                """
                SELECT
                    product_id,
                    product_code,
                    product_name,
                    quantity,
                    TO_CHAR(expiry_date::date, 'YYYY-MM-DD') AS expiry_date,
                    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                    status
                FROM product
                WHERE product_code = :product_code
                LIMIT 1
                """
            )
        else:
            sql = text(
                """
                SELECT
                    product_id,
                    product_code,
                    product_name,
                    quantity,
                    DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
                    status
                FROM product
                WHERE product_code = :product_code
                LIMIT 1
                """
            )

        row = conn.execute(sql, {"product_code": product_code}).mappings().first()

    if row is None:
        return {
            "found": False,
            "message": f"Khong tim thay san pham co ma {product_code}.",
            "product": None,
        }

    return {"found": True, "product": normalize_row(dict(row))}


def find_expired_products(days: int = 0, limit: int = 20) -> Dict[str, Any]:
    if engine is None:
        raise ChatContextError("DATABASE_URL is not configured for AI service.")

    safe_days = max(0, int(days))
    safe_limit = min(max(1, int(limit)), 100)

    with engine.connect() as conn:
        if engine.dialect.name.startswith("postgres"):
            sql = text(
                """
                SELECT
                    product_id,
                    product_code,
                    product_name,
                    quantity,
                    TO_CHAR(expiry_date::date, 'YYYY-MM-DD') AS expiry_date,
                    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                    status
                FROM product
                WHERE status = 1
                  AND expiry_date IS NOT NULL
                  AND expiry_date <= CURRENT_DATE + CAST(:days AS INTEGER)
                ORDER BY expiry_date ASC
                LIMIT :limit
                """
            )
        else:
            sql = text(
                """
                SELECT
                    product_id,
                    product_code,
                    product_name,
                    quantity,
                    DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
                    status
                FROM product
                WHERE status = 1
                  AND expiry_date IS NOT NULL
                  AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL :days DAY)
                ORDER BY expiry_date ASC
                LIMIT :limit
                """
            )

        rows = conn.execute(sql, {"days": safe_days, "limit": safe_limit}).mappings().all()

    return {
        "days": safe_days,
        "total": len(rows),
        "products": [normalize_row(dict(row)) for row in rows],
    }


def search_product_by_name(keyword: str, limit: int = 10) -> Dict[str, Any]:
    if engine is None:
        raise ChatContextError("DATABASE_URL is not configured for AI service.")

    clean_keyword = keyword.strip()
    safe_limit = min(max(1, int(limit)), 50)

    if not clean_keyword:
        return {"keyword": "", "total": 0, "products": []}

    pattern = f"%{clean_keyword}%"

    with engine.connect() as conn:
        if engine.dialect.name.startswith("postgres"):
            sql = text(
                """
                SELECT
                    product_id,
                    product_code,
                    product_name,
                    quantity,
                    TO_CHAR(expiry_date::date, 'YYYY-MM-DD') AS expiry_date,
                    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
                    status
                FROM product
                WHERE LOWER(product_name) LIKE LOWER(:pattern)
                ORDER BY product_name ASC
                LIMIT :limit
                """
            )
        else:
            sql = text(
                """
                SELECT
                    product_id,
                    product_code,
                    product_name,
                    quantity,
                    DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
                    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
                    status
                FROM product
                WHERE product_name LIKE :pattern
                ORDER BY product_name ASC
                LIMIT :limit
                """
            )

        rows = conn.execute(sql, {"pattern": pattern, "limit": safe_limit}).mappings().all()

    return {
        "keyword": clean_keyword,
        "total": len(rows),
        "products": [normalize_row(dict(row)) for row in rows],
    }


TOOL_DECLARATIONS = [
    {
        "name": "get_stock_by_sku",
        "description": "Lay ton kho, han su dung va ngay nhap hang (created_at) theo ma san pham (SKU/product_code).",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "product_code": {
                    "type": "STRING",
                    "description": "Ma san pham can tra cuu, vi du P001",
                }
            },
            "required": ["product_code"],
        },
    },
    {
        "name": "find_expired_products",
        "description": "Tim san pham da het han hoac sap het han trong N ngay toi, kem ngay nhap hang created_at.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "days": {
                    "type": "INTEGER",
                    "description": "So ngay canh bao. 0 nghia la da het han hoac het han hom nay.",
                },
                "limit": {
                    "type": "INTEGER",
                    "description": "So luong ket qua toi da.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "search_product_by_name",
        "description": "Tim san pham theo ten gan dung, tra ve ton kho, han su dung va ngay nhap hang created_at.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "keyword": {
                    "type": "STRING",
                    "description": "Tu khoa tim kiem theo ten san pham",
                },
                "limit": {
                    "type": "INTEGER",
                    "description": "So luong ket qua toi da.",
                },
            },
            "required": ["keyword"],
        },
    },
]


def parse_function_calls(response: Any) -> List[Dict[str, Any]]:
    calls: List[Dict[str, Any]] = []
    candidates = getattr(response, "candidates", None) or []

    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            function_call = getattr(part, "function_call", None)
            if function_call is None:
                continue

            function_name = getattr(function_call, "name", "")
            if not function_name:
                continue

            args_obj = getattr(function_call, "args", None) or {}
            args_dict = {key: value for key, value in args_obj.items()} if hasattr(args_obj, "items") else {}
            calls.append(
                {
                    "name": function_name,
                    "args": args_dict,
                }
            )

    return calls


def run_tool(name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    if name == "get_stock_by_sku":
        product_code = str(args.get("product_code", "")).strip()
        if not product_code:
            return {"error": "product_code is required"}
        return get_stock_by_sku(product_code=product_code)

    if name == "find_expired_products":
        days = args.get("days", 0)
        limit = args.get("limit", 20)
        return find_expired_products(days=days, limit=limit)

    if name == "search_product_by_name":
        keyword = str(args.get("keyword", "")).strip()
        if not keyword:
            return {"error": "keyword is required"}
        limit = args.get("limit", 10)
        return search_product_by_name(keyword=keyword, limit=limit)

    return {"error": f"Unsupported tool: {name}"}


def get_response_text(response: Any) -> str:
    text_value = getattr(response, "text", None)
    if text_value:
        return text_value
    return "Xin loi, toi chua the tao cau tra loi luc nay."


def build_chat_reply(message: str) -> str:
    model = get_gemini_model()
    chat = model.start_chat(history=[])

    response = chat.send_message(
        message,
        tools=[{"function_declarations": TOOL_DECLARATIONS}],
    )

    for _ in range(6):
        calls = parse_function_calls(response)
        if not calls:
            return get_response_text(response)

        tool_responses = []
        for call in calls:
            tool_name = call.get("name", "")
            tool_args = call.get("args", {})
            try:
                result = run_tool(tool_name, tool_args)
            except Exception as exc:
                result = {"error": f"Tool execution failed: {exc}"}

            tool_responses.append(
                {
                    "function_response": {
                        "name": tool_name,
                        "response": {"result": result},
                    }
                }
            )

        response = chat.send_message(tool_responses)

    return "Xin loi, toi can them thoi gian de xu ly. Vui long thu lai."


engine = create_db_engine()


app = FastAPI(title="SmartPharma AI Service", version="1.0.0")

allowed_origin = os.getenv("CORS_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service"}


@app.post("/api/v1/inventory-recommendation", response_model=RecommendationResponse)
def inventory_recommendation(payload: RecommendationRequest):
    try:
        return build_recommendations(payload.items)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/v1/inventory-lots")
def get_inventory_lots_from_db():
    if engine is None:
        raise HTTPException(
            status_code=500,
            detail="DATABASE_URL is not configured for AI service.",
        )

    with engine.connect() as conn:
        try:
            if engine.dialect.name.startswith("postgres"):
                sql = text(
                    """
                    SELECT
                        CAST(product_id AS TEXT) AS lot_id,
                        product_id,
                        product_name,
                        NULL AS batch_no,
                        quantity,
                        TO_CHAR(expiry_date::date, 'YYYY-MM-DD') AS expiry_date
                    FROM product
                    WHERE status = 1
                      AND expiry_date IS NOT NULL
                      AND quantity > 0
                    """
                )
            else:
                sql = text(
                    """
                    SELECT
                        CAST(product_id AS CHAR) AS lot_id,
                        product_id,
                        product_name,
                        NULL AS batch_no,
                        quantity,
                        DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date
                    FROM product
                    WHERE status = 1
                      AND expiry_date IS NOT NULL
                      AND quantity > 0
                    """
                )

            rows = conn.execute(
                sql
            ).mappings().all()
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Unable to read inventory data from DB: {exc}",
            ) from exc

    normalized_items = []
    for row in rows:
        row_dict = dict(row)
        row_dict["expiry_date"] = str(row_dict["expiry_date"])
        normalized_items.append(row_dict)

    return {"items": normalized_items}


@app.get("/api/v1/inventory-recommendation/from-db", response_model=RecommendationResponse)
def inventory_recommendation_from_db():
    payload = get_inventory_lots_from_db()
    items = [InventoryItem(**item) for item in payload["items"]]
    return build_recommendations(items)

