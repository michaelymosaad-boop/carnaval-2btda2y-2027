# توثيق دوال الباك إند (API & Supabase RPCs)

## دوال المرحلة 1 و 2 (الأساس والدخول والهوية)

| الدالة | المدخلات | المخرجات | القواعد الأمنية والتحقق |
| :--- | :--- | :--- | :--- |
| `register_servant` | `edition_id`, `full_name`, `service_id`, `phone`, `whatsapp`, `email`, `national_id`, `health_and_skills` | `servant_id`, `status: 'pending'`, `delivery_status` | متاحة فقط في المراحل `1..3` من `editions.current_stage`. تحسب `national_id_hash` وتحفظ `national_id_last4` فقط. تولّد `qr_token` عشوائي وكود دخول سري مجزأ `code_hash`، وتسجل العملية في `audit_log`. |
| `verify_login_code` | `login_mode` (`team_lead` / `staff` / `admin`), `code`, `admin_username?`, `admin_password?` | `session_token`, `servant`, `roles[]` | تتحقق من حد المحاولات (Rate Limit)، تطابق `code_hash` غير المنتهي، تتحقق من حالة الحساب (`pending` يعرض شاشة الانتظار، `disabled` يرفض، `approved` يفتح الجلسة)، وتسجل الدخول في `audit_log`. |
| `recover_by_id` | `national_id`, `phone`, `channel` (`email` / `whatsapp_admin`) | `status`, `masked_email`, `attempts_remaining` | **لا تُرجع الكود في الاستجابة أبداً.** تطابق `national_id_hash` مع `phone`، وتولّد كوداً جديداً يُرسل للإيميل أو تنشئ طلب واتساب للأدمن، بحد أقصى 3 محاولات، وتوثق الطلب في `audit_log`. |
| `approve_servants` | `servant_ids[]`, `roles[]`, `actor_id` | `approved_count` | متاحة للأدمن (لكل الخدمات) أو مسؤول الخدمة (لخدمته فقط)، تغيّر الحالة إلى `approved`، وتضيف الأدوار في `servant_roles`، وتوثق في `audit_log`. |

## دوال المراحل القادمة (مجدولة حسب خطة البناء)
- `register_kid` (المرحلة 5)
- `close_registration` / `assign_teams` (المرحلة 6)
- `scan` / `sync_offline_scans` (المرحلة 8)
- `award_points` / `rate_engagement` (المرحلة 9 و 10)
- `report_incident` (المرحلة 11)
- `get_leaderboard` (المرحلة 12)
