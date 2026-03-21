import logging
import json
import re
from datetime import datetime
from dataclasses import dataclass
from typing import Any, Callable, Coroutine, Dict, List, Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

try:
    from ddgs import DDGS  # type: ignore
except ImportError:  # pragma: no cover
    from duckduckgo_search import DDGS

from config import cfg

logger = logging.getLogger(__name__)


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: Dict[str, Any]
    fn: Callable[..., Coroutine[Any, Any, str]]


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}

    def register(self, description: str, params: Optional[Dict[str, Any]] = None, name: Optional[str] = None):
        def decorator(fn: Callable[..., Coroutine[Any, Any, str]]):
            tool_name = name or fn.__name__
            self._tools[tool_name] = ToolDefinition(
                name=tool_name,
                description=description,
                parameters=params or {},
                fn=fn,
            )
            return fn

        return decorator

    def get_tools_manifest(self) -> str:
        if not self._tools:
            return "No tools available."

        lines: List[str] = []
        for tool in self._tools.values():
            params_str = ", ".join(f"{k}: {v.get('type', 'any')}" for k, v in tool.parameters.items())
            lines.append(f"- {tool.name}({params_str}): {tool.description}")
        return "\n".join(lines)

    def list_tools(self) -> List[str]:
        return list(self._tools.keys())

    async def execute(self, tool_name: str, tool_args: Dict[str, Any]) -> str:
        tool = self._tools.get(tool_name)
        if not tool:
            return f"Tool '{tool_name}' not found."

        try:
            return await tool.fn(**tool_args)
        except TypeError as ex:
            return f"Invalid arguments for '{tool_name}': {ex}"
        except Exception as ex:
            logger.exception("Tool execution failed: %s", tool_name)
            return f"Tool '{tool_name}' failed: {type(ex).__name__}: {ex}"


registry = ToolRegistry()


def create_db_engine() -> Engine:
    return create_engine(cfg.DATABASE_URL, pool_pre_ping=True)


def _row_to_dict(row: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(row)
    if normalized.get("expiry_date") is not None:
        normalized["expiry_date"] = str(normalized["expiry_date"])
    if normalized.get("created_at") is not None:
        normalized["created_at"] = str(normalized["created_at"])
    return normalized


def _sanitize_product_name(raw_title: str) -> str:
    cleaned = re.sub(r"\s+", " ", raw_title or "").strip()
    cleaned = re.sub(r"\s*[\-|\|].*$", "", cleaned).strip()
    return cleaned[:255] if cleaned else "Thuoc giam dau"


def _generate_web_product_code() -> str:
    # Example: WEB260321215500
    return f"WEB{datetime.now().strftime('%y%m%d%H%M%S')}"


ALLOWED_TABLE_ALIASES = {
    "product": ["product"],
    "product_category": ["product_category", "category_product"],
}


def _resolve_table_name(requested_table: str) -> Optional[str]:
    key = (requested_table or "").strip().lower()
    if key == "category_product":
        key = "product_category"

    candidates = ALLOWED_TABLE_ALIASES.get(key)
    if not candidates:
        return None

    with create_db_engine().connect() as conn:
        for candidate in candidates:
            exists_sql = text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = :table_name
                LIMIT 1
                """
            )
            existed = conn.execute(exists_sql, {"table_name": candidate}).first()
            if existed:
                return candidate
    return None


def _get_table_columns(table_name: str) -> List[str]:
    sql = text(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = :table_name
        ORDER BY ordinal_position
        """
    )
    with create_db_engine().connect() as conn:
        rows = conn.execute(sql, {"table_name": table_name}).mappings().all()
    return [str(row["column_name"]) for row in rows]


def _table_exists(table_name: str) -> bool:
    sql = text(
        """
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = :table_name
        LIMIT 1
        """
    )
    with create_db_engine().connect() as conn:
        row = conn.execute(sql, {"table_name": table_name}).first()
    return row is not None


@registry.register(
    description="Lay danh sach san pham sap het han hoac het hang tu bang product.",
    params={
        "days": {"type": "integer", "description": "So ngay canh bao han dung. Mac dinh 30."},
        "limit": {"type": "integer", "description": "So ban ghi toi da. Mac dinh 20."},
    },
)
async def check_inventory(days: int = 30, limit: int = 20) -> str:
    safe_days = max(0, int(days))
    safe_limit = min(max(1, int(limit)), 100)

    sql = text(
        """
        SELECT
            product_id,
            product_code,
            product_name,
            quantity,
            DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
            status
        FROM product
        WHERE status = 1
          AND (
                quantity <= 0
                OR (expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL :days DAY))
              )
        ORDER BY
            CASE WHEN quantity <= 0 THEN 0 ELSE 1 END,
            expiry_date ASC
        LIMIT :limit
        """
    )

    with create_db_engine().connect() as conn:
        rows = conn.execute(sql, {"days": safe_days, "limit": safe_limit}).mappings().all()

    if not rows:
        return "Khong co san pham het hang hoac sap het han trong nguong da chon."

    lines = [f"Canh bao ton kho (days={safe_days}, total={len(rows)}):"]
    for idx, row in enumerate(rows, start=1):
        item = _row_to_dict(dict(row))
        lines.append(
            f"{idx}. {item.get('product_name')} ({item.get('product_code')}) | qty={item.get('quantity')} | expiry={item.get('expiry_date')}"
        )
    return "\n".join(lines)


@registry.register(
    description="Truy van lich su hoat dong nhan vien tu bang log (gia dinh bang log ton tai).",
    params={
        "limit": {"type": "integer", "description": "So dong log toi da tra ve. Mac dinh 20."},
    },
)
async def get_system_logs(limit: int = 20) -> str:
    safe_limit = min(max(1, int(limit)), 100)
    sql = text(
        """
        SELECT *
        FROM log
        ORDER BY created_at DESC
        LIMIT :limit
        """
    )

    try:
        with create_db_engine().connect() as conn:
            rows = conn.execute(sql, {"limit": safe_limit}).mappings().all()
    except Exception as ex:
        return (
            "Khong the doc bang log. Kiem tra lai schema (bang log co the chua duoc tao). "
            f"Chi tiet: {type(ex).__name__}: {ex}"
        )

    if not rows:
        return "Bang log hien khong co du lieu."

    lines = [f"System logs gan nhat (total={len(rows)}):"]
    for idx, row in enumerate(rows, start=1):
        item = _row_to_dict(dict(row))
        actor = item.get("full_name") or item.get("username") or item.get("user_id") or "unknown"
        action = item.get("action") or item.get("activity") or "N/A"
        created_at = item.get("created_at") or item.get("timestamp") or "N/A"
        lines.append(f"{idx}. actor={actor} | action={action} | at={created_at}")
    return "\n".join(lines)


@registry.register(
    description=(
        "Lay lich su nhap kho chi tiet tu bang history_import, co the loc theo thang/nam hoac ten san pham."
    ),
    params={
        "month": {"type": "integer", "description": "Thang 1-12. Mac dinh 0 = thang hien tai."},
        "year": {"type": "integer", "description": "Nam. Mac dinh 0 = nam hien tai."},
        "product_keyword": {"type": "string", "description": "Tu khoa ten san pham de loc (tu chon)."},
        "limit": {"type": "integer", "description": "So dong toi da (1-100)."},
    },
)
async def get_import_history(
    month: int = 0,
    year: int = 0,
    product_keyword: str = "",
    limit: int = 30,
) -> str:
    if not _table_exists("history_import"):
        return "Khong tim thay bang history_import trong DB."

    safe_limit = min(max(1, int(limit)), 100)
    filters: List[str] = []
    params: Dict[str, Any] = {"limit": safe_limit}

    if int(month) <= 0:
        filters.append("MONTH(h.created_at) = MONTH(CURDATE())")
    else:
        params["month"] = min(max(1, int(month)), 12)
        filters.append("MONTH(h.created_at) = :month")

    if int(year) <= 0:
        filters.append("YEAR(h.created_at) = YEAR(CURDATE())")
    else:
        params["year"] = min(max(2000, int(year)), 2100)
        filters.append("YEAR(h.created_at) = :year")

    keyword = (product_keyword or "").strip()
    if keyword:
        filters.append("COALESCE(h.product_name, p.product_name, '') LIKE :kw")
        params["kw"] = f"%{keyword}%"

    where_clause = " AND ".join(filters) if filters else "1=1"
    sql = text(
        f"""
        SELECT
            h.history_id,
            h.product_id,
            COALESCE(p.product_code, '') AS product_code,
            COALESCE(h.product_name, p.product_name) AS product_name,
            h.quantity,
            h.purchase_price,
            h.unit,
            DATE_FORMAT(h.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            COALESCE(c.category_name, '') AS category_name
        FROM history_import h
        LEFT JOIN product p ON h.product_id = p.product_id
        LEFT JOIN product_category c ON h.category_id = c.category_id
        WHERE {where_clause}
        ORDER BY h.created_at DESC
        LIMIT :limit
        """
    )

    with create_db_engine().connect() as conn:
        rows = conn.execute(sql, params).mappings().all()

    if not rows:
        return "Khong co du lieu lich su nhap kho theo bo loc hien tai."

    lines = [f"Lich su nhap kho (rows={len(rows)}):"]
    for idx, row in enumerate(rows, start=1):
        item = _row_to_dict(dict(row))
        lines.append(
            f"{idx}. hid={item.get('history_id')} | [{item.get('product_code') or 'N/A'}] {item.get('product_name')} | "
            f"qty={item.get('quantity')} {item.get('unit') or ''} | gia_nhap={item.get('purchase_price')} | "
            f"category={item.get('category_name') or 'N/A'} | at={item.get('created_at')}"
        )
    return "\n".join(lines)


@registry.register(
    description=(
        "Lay login/action logs tu bang log, uu tien cac action lien quan dang nhap hoac thao tac nghiep vu."
    ),
    params={
        "action_keyword": {"type": "string", "description": "Tu khoa action can loc, mac dinh login."},
        "limit": {"type": "integer", "description": "So dong toi da (1-100)."},
    },
)
async def get_login_action_logs(action_keyword: str = "login", limit: int = 30) -> str:
    if not _table_exists("log"):
        return "Khong tim thay bang log trong DB de doc login/action logs."

    safe_limit = min(max(1, int(limit)), 100)
    keyword = (action_keyword or "login").strip().lower()

    sql = text(
        """
        SELECT *
        FROM log
        WHERE LOWER(COALESCE(action, '')) LIKE :kw
           OR LOWER(COALESCE(activity, '')) LIKE :kw
           OR LOWER(COALESCE(description, '')) LIKE :kw
        ORDER BY created_at DESC
        LIMIT :limit
        """
    )

    with create_db_engine().connect() as conn:
        rows = conn.execute(sql, {"kw": f"%{keyword}%", "limit": safe_limit}).mappings().all()

    if not rows:
        return f"Khong co log nao khop tu khoa action '{keyword}'."

    lines = [f"Login/Action logs (keyword={keyword}, rows={len(rows)}):"]
    for idx, row in enumerate(rows, start=1):
        item = _row_to_dict(dict(row))
        actor = item.get("full_name") or item.get("username") or item.get("user_id") or "unknown"
        action = item.get("action") or item.get("activity") or item.get("description") or "N/A"
        created_at = item.get("created_at") or item.get("timestamp") or "N/A"
        lines.append(f"{idx}. actor={actor} | action={action} | at={created_at}")
    return "\n".join(lines)


@registry.register(
    description="Tra cuu chi tiet thong tin ma hang theo SKU (product_code).",
    params={
        "code": {"type": "string", "description": "Ma SKU can tim, vi du P001."},
    },
)
async def search_sku(code: str) -> str:
    sku = (code or "").strip()
    if not sku:
        return "Ban can cung cap ma SKU hop le."

    sql = text(
        """
        SELECT
            product_id,
            product_code,
            product_name,
            quantity,
            unit,
            purchase_price,
            selling_price,
            DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
            status,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM product
        WHERE product_code = :product_code
        LIMIT 1
        """
    )

    with create_db_engine().connect() as conn:
        row = conn.execute(sql, {"product_code": sku}).mappings().first()

    if row is None:
        return f"Khong tim thay ma SKU {sku}."

    item = _row_to_dict(dict(row))
    return (
        f"Thong tin SKU {sku}:\n"
        f"- Ten: {item.get('product_name')}\n"
        f"- So luong: {item.get('quantity')}\n"
        f"- Don vi: {item.get('unit')}\n"
        f"- Gia nhap: {item.get('purchase_price')}\n"
        f"- Gia ban: {item.get('selling_price')}\n"
        f"- Han su dung: {item.get('expiry_date')}\n"
        f"- Trang thai: {item.get('status')}\n"
        f"- Created at: {item.get('created_at')}"
    )


@registry.register(
    description="Dem tong so loai hang trong database va tong so san pham dang hoat dong.",
)
async def count_product_types() -> str:
    sql = text(
        """
        SELECT
            COUNT(*) AS total_products,
            COUNT(DISTINCT COALESCE(category_id, -1)) AS total_types,
            SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END) AS out_of_stock
        FROM product
        WHERE status = 1
        """
    )

    with create_db_engine().connect() as conn:
        row = conn.execute(sql).mappings().first()

    if not row:
        return "Khong doc duoc thong tin tu bang product."

    return (
        "Thong ke kho hien tai:\n"
        f"- Tong so san pham hoat dong: {row.get('total_products', 0)}\n"
        f"- Tong so loai hang (phan theo category_id): {row.get('total_types', 0)}\n"
        f"- So mat hang het ton: {row.get('out_of_stock', 0)}"
    )


@registry.register(
    description=(
        "Liet ke danh sach san pham trong bang product, co the loc theo trang thai hoat dong. "
        "Dung de tra loi cau hoi 'hien tai co bao nhieu san pham va cu the la nhung san pham nao'."
    ),
    params={
        "limit": {"type": "integer", "description": "So ban ghi toi da (1-100). Mac dinh 30."},
        "active_only": {"type": "boolean", "description": "Chi lay san pham status=1. Mac dinh true."},
    },
)
async def list_products(limit: int = 30, active_only: bool = True) -> str:
    safe_limit = min(max(1, int(limit)), 100)

    active_filter = bool(active_only)
    if isinstance(active_only, str):
        active_filter = active_only.strip().lower() not in {"0", "false", "no", "off"}

    category_table = _resolve_table_name("product_category") or "product_category"
    where_clause = "WHERE p.status = 1" if active_filter else ""

    sql = text(
        f"""
        SELECT
            p.product_id,
            p.product_code,
            p.product_name,
            p.quantity,
            p.unit,
            p.status,
            DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
            c.category_name
        FROM product p
        LEFT JOIN {category_table} c ON p.category_id = c.category_id
        {where_clause}
        ORDER BY p.created_at DESC, p.product_id DESC
        LIMIT :limit
        """
    )

    count_sql = text(
        "SELECT COUNT(*) AS total FROM product " + ("WHERE status = 1" if active_filter else "")
    )

    with create_db_engine().connect() as conn:
        total_row = conn.execute(count_sql).mappings().first()
        rows = conn.execute(sql, {"limit": safe_limit}).mappings().all()

    total = int((total_row or {}).get("total", 0))
    if not rows:
        scope_text = "dang hoat dong" if active_filter else "trong he thong"
        return f"Khong co san pham nao {scope_text}."

    scope_text = "dang hoat dong" if active_filter else "trong he thong"
    lines = [f"Danh sach san pham {scope_text}: tong={total}, hien thi={len(rows)}"]
    for idx, row in enumerate(rows, start=1):
        item = _row_to_dict(dict(row))
        lines.append(
            f"{idx}. [{item.get('product_code')}] {item.get('product_name')} | "
            f"qty={item.get('quantity')} {item.get('unit') or ''} | "
            f"category={item.get('category_name') or 'N/A'} | status={item.get('status')}"
        )
    return "\n".join(lines)


@registry.register(
    description=(
        "Liet ke cac san pham da nhap trong thang (theo bang history_import). "
        "Dung de tra loi cau hoi 'thang nay da nhap nhung san pham nao'."
    ),
    params={
        "month": {"type": "integer", "description": "Thang 1-12. Mac dinh 0 de lay thang hien tai."},
        "year": {"type": "integer", "description": "Nam duong lich. Mac dinh 0 de lay nam hien tai."},
        "limit": {"type": "integer", "description": "So dong toi da (1-100). Mac dinh 50."},
    },
)
async def list_imported_products_by_month(month: int = 0, year: int = 0, limit: int = 50) -> str:
    if not _table_exists("history_import"):
        return (
            "Khong tim thay bang history_import trong database nen chua the thong ke nhap kho theo thang. "
            "Vui long kiem tra schema XAMPP."
        )

    safe_limit = min(max(1, int(limit)), 100)
    use_current_month = int(month) <= 0
    use_current_year = int(year) <= 0

    filters: List[str] = []
    params: Dict[str, Any] = {"limit": safe_limit}

    if use_current_month:
        filters.append("MONTH(h.created_at) = MONTH(CURDATE())")
    else:
        safe_month = min(max(1, int(month)), 12)
        filters.append("MONTH(h.created_at) = :month")
        params["month"] = safe_month

    if use_current_year:
        filters.append("YEAR(h.created_at) = YEAR(CURDATE())")
    else:
        safe_year = min(max(2000, int(year)), 2100)
        filters.append("YEAR(h.created_at) = :year")
        params["year"] = safe_year

    where_clause = " AND ".join(filters)

    sql = text(
        f"""
        SELECT
            h.product_id,
            COALESCE(p.product_code, '') AS product_code,
            COALESCE(h.product_name, p.product_name) AS product_name,
            SUM(h.quantity) AS total_import_qty,
            MAX(DATE_FORMAT(h.created_at, '%Y-%m-%d %H:%i:%s')) AS latest_import_at,
            COALESCE(c.category_name, '') AS category_name
        FROM history_import h
        LEFT JOIN product p ON h.product_id = p.product_id
        LEFT JOIN product_category c ON h.category_id = c.category_id
        WHERE {where_clause}
        GROUP BY h.product_id, p.product_code, COALESCE(h.product_name, p.product_name), c.category_name
        ORDER BY latest_import_at DESC
        LIMIT :limit
        """
    )

    with create_db_engine().connect() as conn:
        rows = conn.execute(sql, params).mappings().all()

    if not rows:
        month_label = "thang hien tai" if use_current_month else f"thang {params.get('month')}"
        year_label = "nam hien tai" if use_current_year else f"nam {params.get('year')}"
        return f"Khong co du lieu nhap kho trong {month_label} {year_label}."

    month_label = "thang hien tai" if use_current_month else f"thang {params.get('month')}"
    year_label = "nam hien tai" if use_current_year else f"nam {params.get('year')}"
    lines = [f"San pham da nhap trong {month_label} {year_label} (rows={len(rows)}):"]
    for idx, row in enumerate(rows, start=1):
        item = _row_to_dict(dict(row))
        lines.append(
            f"{idx}. [{item.get('product_code') or 'N/A'}] {item.get('product_name')} | "
            f"tong_nhap={item.get('total_import_qty')} | "
            f"category={item.get('category_name') or 'N/A'} | "
            f"lan_nhap_gan_nhat={item.get('latest_import_at')}"
        )
    return "\n".join(lines)


@registry.register(
    description=(
        "Tim 1 san pham thuoc giam dau tren web va them vao bang product voi thong tin co ban. "
        "Dung khi admin yeu cau tim tren mang va them san pham moi vao kho."
    ),
    params={
        "query": {"type": "string", "description": "Tu khoa tim kiem, mac dinh 'thuoc giam dau'."},
        "quantity": {"type": "integer", "description": "So luong khoi tao cho san pham moi, mac dinh 50."},
    },
)
async def find_and_add_product_from_web(query: str = "thuoc giam dau", quantity: int = 50) -> str:
    safe_query = (query or "thuoc giam dau").strip()
    safe_quantity = max(1, int(quantity))

    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(safe_query, max_results=3))
    except Exception as ex:
        return f"Khong the tim kiem tren web: {type(ex).__name__}: {ex}"

    if not results:
        return f"Khong tim thay ket qua nao voi tu khoa: {safe_query}"

    first = results[0]
    title = str(first.get("title") or "Thuoc giam dau")
    source_link = str(first.get("href") or "")
    product_name = _sanitize_product_name(title)

    insert_sql = text(
        """
        INSERT INTO product
        (product_code, product_name, quantity, unit, purchase_price, selling_price, description, status)
        VALUES
        (:product_code, :product_name, :quantity, :unit, :purchase_price, :selling_price, :description, :status)
        """
    )

    check_sql = text("SELECT 1 FROM product WHERE product_code = :product_code LIMIT 1")
    product_code = _generate_web_product_code()

    with create_db_engine().begin() as conn:
        # Retry a few times in the unlikely event of code collision.
        for _ in range(5):
            existed = conn.execute(check_sql, {"product_code": product_code}).first()
            if not existed:
                break
            product_code = _generate_web_product_code()

        conn.execute(
            insert_sql,
            {
                "product_code": product_code,
                "product_name": product_name,
                "quantity": safe_quantity,
                "unit": "hop",
                "purchase_price": 0,
                "selling_price": 0,
                "description": f"Them tu web search. Nguon: {source_link}",
                "status": 1,
            },
        )

    return (
        "Da them san pham moi tu web thanh cong:\n"
        f"- Ma: {product_code}\n"
        f"- Ten: {product_name}\n"
        f"- So luong: {safe_quantity}\n"
        f"- Nguon tham khao: {source_link}"
    )


@registry.register(
    description=(
        "Doc danh sach cot (schema) cua bang product hoac product_category/category_product "
        "de AI biet tung truong du lieu."
    ),
    params={
        "table_name": {
            "type": "string",
            "description": "Ten bang: product, product_category hoac category_product.",
        },
    },
)
async def describe_table_fields(table_name: str = "product") -> str:
    resolved = _resolve_table_name(table_name)
    if not resolved:
        return (
            "Khong tim thay bang hop le. Chi ho tro: product, product_category/category_product "
            "(neu bang ton tai trong DB)."
        )

    sql = text(
        """
        SELECT
            column_name,
            column_type,
            is_nullable,
            column_key,
            column_default,
            extra
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = :table_name
        ORDER BY ordinal_position
        """
    )

    with create_db_engine().connect() as conn:
        rows = conn.execute(sql, {"table_name": resolved}).mappings().all()

    if not rows:
        return f"Bang {resolved} khong co schema de doc."

    lines = [f"Schema bang {resolved} ({len(rows)} cot):"]
    for idx, row in enumerate(rows, start=1):
        lines.append(
            f"{idx}. {row.get('column_name')} | type={row.get('column_type')} | "
            f"nullable={row.get('is_nullable')} | key={row.get('column_key') or '-'} | "
            f"default={row.get('column_default')} | extra={row.get('extra') or '-'}"
        )
    return "\n".join(lines)


@registry.register(
    description=(
        "Doc chi tiet du lieu theo tung truong cua bang product hoac product_category/category_product. "
        "Cho phep loc theo 1 cot va tra ve cac row khop dieu kien."
    ),
    params={
        "table_name": {
            "type": "string",
            "description": "Ten bang: product, product_category hoac category_product.",
        },
        "where_field": {
            "type": "string",
            "description": "Ten cot dung de loc (phai ton tai trong bang).",
        },
        "where_value": {
            "type": "string",
            "description": "Gia tri loc. De trong neu muon lay cac ban ghi moi nhat.",
        },
        "match_mode": {
            "type": "string",
            "description": "exact hoac like (mac dinh exact).",
        },
        "limit": {
            "type": "integer",
            "description": "So ban ghi toi da (1-20).",
        },
    },
)
async def read_table_field_details(
    table_name: str = "product",
    where_field: str = "product_code",
    where_value: str = "",
    match_mode: str = "exact",
    limit: int = 5,
) -> str:
    resolved = _resolve_table_name(table_name)
    if not resolved:
        return "Khong tim thay bang hop le de truy van."

    safe_limit = min(max(1, int(limit)), 20)
    columns = _get_table_columns(resolved)
    if not columns:
        return f"Khong doc duoc danh sach cot cua bang {resolved}."

    safe_field = (where_field or "").strip()
    if safe_field and safe_field not in columns:
        return f"Cot '{safe_field}' khong ton tai trong bang {resolved}."

    params: Dict[str, Any] = {"limit": safe_limit}
    if not safe_field:
        sql = text(f"SELECT * FROM {resolved} ORDER BY 1 DESC LIMIT :limit")
    else:
        mode = (match_mode or "exact").strip().lower()
        if mode == "like":
            sql = text(f"SELECT * FROM {resolved} WHERE {safe_field} LIKE :where_value ORDER BY 1 DESC LIMIT :limit")
            params["where_value"] = f"%{where_value}%"
        else:
            sql = text(f"SELECT * FROM {resolved} WHERE {safe_field} = :where_value ORDER BY 1 DESC LIMIT :limit")
            params["where_value"] = where_value

    with create_db_engine().connect() as conn:
        rows = conn.execute(sql, params).mappings().all()

    if not rows:
        return f"Khong tim thay du lieu phu hop trong bang {resolved}."

    rendered = [{k: (str(v) if v is not None else None) for k, v in dict(row).items()} for row in rows]
    return (
        f"Chi tiet du lieu bang {resolved} (rows={len(rendered)}):\n"
        f"{json.dumps(rendered, ensure_ascii=False, indent=2)}"
    )


@registry.register(
    description=(
        "Lay ho so day du cua san pham (join product + product_category) theo SKU, product_id hoac ten. "
        "Dung khi can xem tung truong chi tiet de tra loi nghiep vu cu the."
    ),
    params={
        "identifier": {
            "type": "string",
            "description": "Gia tri tim kiem, vi du P001, 15 hoac Paracetamol.",
        },
        "search_by": {
            "type": "string",
            "description": "sku | id | name (mac dinh sku).",
        },
        "match_mode": {
            "type": "string",
            "description": "exact hoac like (chi ap dung voi search_by=name).",
        },
        "limit": {
            "type": "integer",
            "description": "So ban ghi toi da (1-20).",
        },
    },
)
async def get_product_full_profile(
    identifier: str,
    search_by: str = "sku",
    match_mode: str = "exact",
    limit: int = 5,
) -> str:
    value = (identifier or "").strip()
    if not value:
        return "Ban can cung cap identifier de tim san pham."

    safe_limit = min(max(1, int(limit)), 20)
    mode = (search_by or "sku").strip().lower()
    like_mode = (match_mode or "exact").strip().lower() == "like"

    category_table = _resolve_table_name("product_category")
    if not category_table:
        category_table = "product_category"

    base_sql = (
        f"""
        SELECT
            p.product_id,
            p.product_code,
            p.product_name,
            p.category_id,
            c.category_name,
            c.description AS category_description,
            p.unit,
            p.purchase_price,
            p.selling_price,
            p.quantity,
            DATE_FORMAT(p.expiry_date, '%Y-%m-%d') AS expiry_date,
            p.image,
            p.description AS product_description,
            p.status,
            DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM product p
        LEFT JOIN {category_table} c ON p.category_id = c.category_id
        """
    )

    params: Dict[str, Any] = {"limit": safe_limit}
    if mode == "id":
        if not value.isdigit():
            return "search_by=id yeu cau identifier la so nguyen."
        sql = text(base_sql + " WHERE p.product_id = :value ORDER BY p.product_id DESC LIMIT :limit")
        params["value"] = int(value)
    elif mode == "name":
        if like_mode:
            sql = text(base_sql + " WHERE p.product_name LIKE :value ORDER BY p.product_id DESC LIMIT :limit")
            params["value"] = f"%{value}%"
        else:
            sql = text(base_sql + " WHERE p.product_name = :value ORDER BY p.product_id DESC LIMIT :limit")
            params["value"] = value
    else:
        sql = text(base_sql + " WHERE p.product_code = :value ORDER BY p.product_id DESC LIMIT :limit")
        params["value"] = value

    with create_db_engine().connect() as conn:
        rows = conn.execute(sql, params).mappings().all()

    if not rows:
        return "Khong tim thay ho so san pham phu hop dieu kien tim kiem."

    rendered = [{k: (str(v) if v is not None else None) for k, v in dict(row).items()} for row in rows]
    return (
        f"Ho so day du san pham (rows={len(rendered)}):\n"
        f"{json.dumps(rendered, ensure_ascii=False, indent=2)}"
    )
