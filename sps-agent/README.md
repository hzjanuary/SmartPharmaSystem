# SPS Agent

SPS Agent la Telegram bot danh cho admin SmartPharma, chay bang Bot API polling va chi can token cua BotFather.

## Yeu cau
- TELEGRAM_BOT_TOKEN
- GEMINI_API_KEY
- DATABASE_URL

## Bien moi truong khuyen nghi
- TELEGRAM_OWNER_ID
- ADMIN_CHAT_ID
- GEMINI_MODEL
- MAX_TOKENS
- AGENT_NAME
- SHORT_TERM_LIMIT

## Chay voi Docker
```bash
docker compose up --build -d sps-agent
```

## Kiem tra log
```bash
docker compose logs sps-agent --tail=120
```

## Tools hien tai
- check_inventory
- get_system_logs
- search_sku
- count_product_types
- find_and_add_product_from_web
- describe_table_fields
- read_table_field_details
- get_product_full_profile

## Luu y
- Khong can TELEGRAM_API_ID/TELEGRAM_API_HASH.
- Neu doi bot token tren BotFather, cap nhat lai .env va restart service.
