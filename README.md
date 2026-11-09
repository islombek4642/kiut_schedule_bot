# KIUT Schedule OCR Telegram Bot

KIUT (Kimyo International University in Tashkent) dars jadvallarini rasmdan o‘qib, tartibli `schedule.json` fayl va Telegramda chiroyli matnli ko‘rinishga aylantiruvchi Telegram bot.

Loyiha rasmiy **[Telegram Serverless](https://core.telegram.org/bots/serverless)** platformasida ishlaydi va **Groq Vision API** (`qwen/qwen3.8-27b`) orqali soniyalar ichida yuqori aniqlikda tahlil qiladi.

---

## 🔐 Xavfsizlik va Tokenlar

Telegram Serverless V8 sandbox runtime bo‘lgani sababli, unda an’anaviy serverlardagi kabi `.env` faylini `process.env` orqali o‘qib bo‘lmaydi. 

Shu sababli loyihada eng xavfsiz arxitektura qo‘llangan:
* **Kodda hech qanday token yo‘q:** `tgcloud/lib/config.js` yoki boshqa biror faylda API kalitlar saqlanmaydi.
* **Bulutdagi SQLite bazasida:** Groq API kaliti Telegram Serverless’ning xavfsiz ichki SQLite bazasida (`settings` jadvali) saqlanadi. U Git repozitoriyasiga yoki GitHub’ga hech qachon chiqmaydi.
* **Foydalanuvchilar kalit kiritmaydi:** Bot barcha foydalanuvchilar uchun admin tomonidan kiritilgan ushbu kalit orqali ishlaydi.

---

## 🚀 Telegram Serverless orqali ishga tushirish

Server (VPS), Docker yoki Tesseract o‘rnatish talab etilmaydi. Kod to‘g‘ridan-to‘g‘ri Telegram infratuzilmasida ishlaydi.

### 1. Botda Serverless funksiyasini yoqish
1. Telegramda [@BotFather](https://t.me/BotFather) botiga kiring.
2. O‘z botingizni tanlang: `/mybots` -> Botingiz -> **Serverless**.
3. **Turn On** (Yoqish) tugmasini bosing.
4. **CLI Access** -> **Access token** bo‘limiga kirib, `app<id>:<secret>` ko‘rinishidagi tokenni nusxalang.

### 2. Loyihani botga ulash (Login)
Terminalda quyidagi buyruqni bering va BotFather’dan olgan tokenni kiriting:
```bash
npx tgcloud login
```

### 3. Deploy qilish (Telegram Cloud’ga yuklash)
```bash
npx tgcloud push       # Modullarni bulutga yuklash
npx tgcloud migrate    # SQLite ma'lumotlar bazasi jadvallarini yaratish
```

### 4. Admin kalitini o‘rnatish (bir martalik)
Agar kalitni yangilash kerak bo‘lsa:
```bash
npx tgcloud run endpoints/setAdminKey '{\"key\":\"gsk_SIZNING_GROQ_KALITINGIZ\"}'
```

Botingiz tayyor! Telegramda unga dars jadvali rasmini yuboring va natijani oling.

---

## 🛠 Loyiha tuzilishi

```text
kiut_schedule_bot/
├── tgcloud/                    # Telegram Serverless tomonidan ishga tushadigan kodlar
│   ├── handlers/
│   │   └── message.js          # Xabarlar, rasmlar va komandalar handleri (/start, /today, /schedule)
│   ├── endpoints/
│   │   └── setAdminKey.js      # Groq API kalitini SQLite bazasiga xavfsiz yozish
│   ├── lib/
│   │   ├── config.js           # Groq modeli sozlamalari (tokenlarsiz)
│   │   ├── groq.js             # Groq Vision API integratsiyasi va normallashtirish
│   │   ├── format.js           # Telegramda jadvalni Markdown qilib ko'rsatish
│   │   └── util.js             # Uint8Array -> Base64 konverteri
│   └── schema.js               # O‘rnatilgan SQLite bazasi (settings, schedules, users)
├── docs/
│   └── tgcloud-sdk.md          # Telegram Serverless SDK rasmiy qo‘llanmasi
├── AGENTS.md                   # AI kod yozuvchilar uchun qo‘llanma
├── package.json
└── tgcloud.jsonc
```

---

## ⚡ Foydali buyruqlar

* `npx tgcloud status` — Lokal fayllar va bulutdagi holat farqini ko‘rish.
* `npx tgcloud diff` — Qaysi qatorlar o‘zgarganini tekshirish.
* `npx tgcloud push` — O‘zgarishlarni deploy qilish.
* `npx tgcloud migrate` — Baza o‘zgarishlarini qo‘llash.
* `npx tgcloud run handlers/message '{ chat: { id: 1 }, text: "/start" }'` — Deploy qilmasdan serverda test qilish.
