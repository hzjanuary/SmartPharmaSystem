import logging
import sys
from typing import Optional

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from brain import brain
from config import cfg
from memory import memory_manager
from tools import registry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("fluxclaw.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)
# Avoid logging full request URLs (which include bot token) from httpx internals.
logging.getLogger("httpx").setLevel(logging.WARNING)


def _is_authorized(update: Update) -> bool:
    if cfg.TELEGRAM_OWNER_ID == 0:
        return True
    user = update.effective_user
    if not user:
        return False
    return user.id == cfg.TELEGRAM_OWNER_ID


async def _reply_long(message, text: str):
    if not text:
        await message.reply_text("Toi khong nhan duoc noi dung tra loi hop le.")
        return

    max_len = 4090
    if len(text) <= max_len:
        await message.reply_text(text)
        return

    chunks = [text[i:i + max_len] for i in range(0, len(text), max_len)]
    for i, chunk in enumerate(chunks, start=1):
        suffix = f"\n\n(Part {i}/{len(chunks)})" if len(chunks) > 1 else ""
        await message.reply_text(chunk + suffix)


async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not _is_authorized(update):
        return

    user_name = (update.effective_user.first_name if update.effective_user else "ban")
    welcome = (
        f"Xin chao {user_name}. Toi la {cfg.AGENT_NAME}.\n"
        f"Toi co {len(registry.list_tools())} tools de ho tro quan tri kho.\n"
        "Lenh co ban: /help, /status, /reset"
    )
    await update.message.reply_text(welcome)


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not _is_authorized(update):
        return

    help_text = (
        f"{cfg.AGENT_NAME} - Danh sach tools:\n\n"
        f"{registry.get_tools_manifest()}\n\n"
        "Ban co the nhap yeu cau bang ngon ngu tu nhien."
    )
    await update.message.reply_text(help_text)


async def status_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not _is_authorized(update):
        return

    chat = update.effective_chat
    if not chat:
        return

    raw_args = " ".join(context.args).strip().lower()
    if "latency" in raw_args:
        await update.message.reply_text(brain.get_latency_report(chat.id))
        return

    memory = memory_manager.get(chat.id)
    stm_count = len(memory.short_term)
    has_core = bool(memory.core_context)
    preview = memory.core_context[:150] + "..." if len(memory.core_context) > 150 else (memory.core_context or "(empty)")

    text = (
        f"Memory status chat {chat.id}:\n"
        f"- STM: {stm_count}/{cfg.SHORT_TERM_LIMIT}\n"
        f"- Core context: {'active' if has_core else 'empty'}\n"
        f"- Preview: {preview}\n"
        f"- Model: {cfg.DEFAULT_MODEL}\n"
        f"- Tools: {len(registry.list_tools())}"
    )
    await update.message.reply_text(text)


async def reset_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not _is_authorized(update):
        return

    chat = update.effective_chat
    if not chat:
        return

    memory_manager.clear(chat.id)
    await update.message.reply_text("Da xoa bo nho cua cuoc hoi thoai nay.")


async def text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not _is_authorized(update):
        logger.warning("Blocked message from unauthorized user %s", update.effective_user.id if update.effective_user else "unknown")
        return

    if not update.message or not update.message.text:
        return

    chat = update.effective_chat
    if not chat:
        return

    user_text = update.message.text.strip()
    if not user_text:
        return

    try:
        await context.bot.send_chat_action(chat_id=chat.id, action=ChatAction.TYPING)
        response = await brain.think(chat.id, user_text)
        await _reply_long(update.message, response)
    except Exception as ex:
        logger.exception("Unhandled error while processing Telegram message.")
        await update.message.reply_text(f"Loi khong mong muon: {type(ex).__name__}")


def main():
    if not cfg.TELEGRAM_BOT_TOKEN:
        logger.critical("TELEGRAM_BOT_TOKEN is not set.")
        return

    logger.info("=" * 60)
    logger.info("  %s — Starting Up (Telegram Bot API Polling)", cfg.AGENT_NAME)
    logger.info("  Model     : %s", cfg.DEFAULT_MODEL)
    logger.info("  Memory    : %d messages per chat", cfg.SHORT_TERM_LIMIT)
    logger.info("  Tools     : %s", ", ".join(registry.list_tools()))
    logger.info("=" * 60)

    app = Application.builder().token(cfg.TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start_cmd))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("status", status_cmd))
    app.add_handler(CommandHandler("reset", reset_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_handler))

    if cfg.TELEGRAM_OWNER_ID:
        logger.info("[Bot] Restricted to owner ID: %d", cfg.TELEGRAM_OWNER_ID)
    else:
        logger.info("[Bot] Running in PUBLIC mode.")

    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
