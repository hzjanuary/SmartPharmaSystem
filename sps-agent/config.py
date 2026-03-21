import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    TELEGRAM_BOT_TOKEN: str = field(default_factory=lambda: os.environ.get("TELEGRAM_BOT_TOKEN", ""))
    TELEGRAM_OWNER_ID: int = field(default_factory=lambda: int(os.environ.get("TELEGRAM_OWNER_ID", "0")))
    ADMIN_CHAT_ID: str = field(default_factory=lambda: os.environ.get("ADMIN_CHAT_ID", ""))

    GEMINI_API_KEY: str = field(default_factory=lambda: os.environ.get("GEMINI_API_KEY", ""))
    GEMINI_MODEL: str = field(default_factory=lambda: os.environ.get("GEMINI_MODEL", "gemini-1.5-flash"))
    DEFAULT_MODEL: str = field(default_factory=lambda: os.environ.get("GEMINI_MODEL", "gemini-1.5-flash"))
    MAX_TOKENS: int = field(default_factory=lambda: int(os.environ.get("MAX_TOKENS", "1024")))

    DATABASE_URL: str = field(
        default_factory=lambda: os.environ.get(
            "DATABASE_URL",
            "mysql+pymysql://root:@db:3306/pharmacymanagement",
        )
    )

    SHORT_TERM_LIMIT: int = field(default_factory=lambda: int(os.environ.get("SHORT_TERM_LIMIT", "10")))
    AGENT_NAME: str = field(default_factory=lambda: os.environ.get("AGENT_NAME", "SPS Agent"))


cfg = Config()


SYSTEM_PROMPT_TEMPLATE = """
Bạn là Trợ lý SPS Agent, chuyên hỗ trợ Admin quản lý kho dược SmartPharma qua Telegram.
Chỉ trả lời dựa trên dữ liệu thật từ tools.

Quy tắc bắt buộc:
1. Nếu câu hỏi cần dữ liệu kho hoặc mã hàng, bạn phải gọi tools trước khi trả lời.
2. Không được tự bịa số liệu, không dùng dữ liệu giả định.
3. Trả lời ngắn gọn, rõ ràng, ưu tiên tiếng Việt.
4. Với câu hỏi kiểu "có bao nhiêu sản phẩm" hoặc "liệt kê sản phẩm", ưu tiên dùng list_products.
5. Với câu hỏi kiểu "tháng này đã nhập gì", ưu tiên dùng list_imported_products_by_month.
6. Chỉ nói "không hỗ trợ" khi đã thử tool phù hợp và tool báo lỗi/schema thiếu.

Available tools:
{available_tools}
""".strip()
