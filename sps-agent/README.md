# SPS Agent

SPS Agent là Telegram bot dành cho admin SmartPharma, chạy bằng Bot API polling và chỉ cần token của BotFather.

## Yêu cầu
- TELEGRAM_BOT_TOKEN
- GEMINI_API_KEY
- DATABASE_URL

## Biến môi trường khuyến nghị
- TELEGRAM_OWNER_ID
- ADMIN_CHAT_ID
- GEMINI_MODEL
- MAX_TOKENS
- AGENT_NAME
- SHORT_TERM_LIMIT

## Chạy với Docker
```bash
docker compose up --build -d sps-agent
```

## Kiểm tra log
```bash
docker compose logs sps-agent --tail=120
```

## Tools hiện tại
- check_inventory
- get_system_logs
- get_import_history
- get_login_action_logs
- search_sku
- count_product_types
- list_products
- list_imported_products_by_month
- find_and_add_product_from_web
- describe_table_fields
- read_table_field_details
- get_product_full_profile

## Lưu ý
- Không cần TELEGRAM_API_ID/TELEGRAM_API_HASH.
- Nếu đổi bot token trên BotFather, cập nhật lại .env và restart service.
