# Danh Sách Công Việc - 21/03

## Phạm vi
- Giữ nguyên logic thông báo đăng nhập Telegram hiện có ở backend.
- Bổ sung/hoàn thiện backend để lưu login/action logs và import history logs.
- Bổ sung frontend hiển thị thông tin tài khoản đang đăng nhập.
- Đảm bảo hợp đồng dữ liệu phù hợp với các tool của SPS Agent.

---

## Công việc cho Team Backend

### BE-01: Mở rộng dữ liệu trả về khi đăng nhập
**Mục tiêu**: Trả về đủ thông tin người dùng để frontend hiển thị.

**Yêu cầu**:
- Trong response đăng nhập thành công, bắt buộc có:
  - user_id
  - username
  - full_name
  - role
- Giữ nguyên cơ chế xác thực bằng session hiện tại.
- Giữ nguyên luồng thông báo đăng nhập Telegram hiện tại.

**Tiêu chí nghiệm thu**:
- Đăng nhập thành công trả về đầy đủ object user như trên.
- Tính năng thông báo Telegram vẫn hoạt động bình thường.

---

### BE-02: Bổ sung API lấy thông tin phiên đăng nhập
**Mục tiêu**: Cho phép frontend khôi phục thông tin user sau khi reload.

**Yêu cầu**:
- Tạo endpoint: GET /api/auth/me
- Hành vi:
  - Nếu session hợp lệ: trả user_id, username, full_name, role.
  - Nếu session không tồn tại/hết hạn: trả 401.

**Tiêu chí nghiệm thu**:
- Frontend gọi /api/auth/me khi app khởi động được.
- Session hợp lệ -> 200 + user info.
- Session không hợp lệ -> 401.

---

### BE-03: Tạo bảng log (migration)
**Mục tiêu**: Tạo nguồn dữ liệu cho tool log của agent.

**Yêu cầu**:
- Bổ sung migration SQL tạo bảng: log
- Cột tối thiểu:
  - id (PK, auto increment)
  - user_id (cho phép null)
  - username (cho phép null)
  - full_name (cho phép null)
  - action (varchar)
  - activity (text, cho phép null)
  - description (text, cho phép null)
  - created_at (timestamp default current_timestamp)
- Index đề xuất:
  - created_at
  - action
  - user_id

**Tiêu chí nghiệm thu**:
- Bảng log tồn tại trên tất cả môi trường.
- Truy vấn theo action + created_at DESC hoạt động ổn định.

---

### BE-04: Tập trung hóa helper ghi log action
**Mục tiêu**: Tránh lặp logic insert log ở nhiều nơi.

**Yêu cầu**:
- Tạo helper/service dùng chung: logAction(payload)
- Hỗ trợ ghi log trong cả luồng có transaction và không transaction.
- Payload hỗ trợ đủ các trường user + action/activity/description.

**Tiêu chí nghiệm thu**:
- Nhiều controller sử dụng cùng một helper.
- Không còn đoạn SQL insert log bị lặp lại nhiều nơi.

---

### BE-05: Ghi auth logs
**Mục tiêu**: Lưu lại đầy đủ hành vi đăng nhập/đăng xuất.

**Yêu cầu**:
- Đăng nhập thành công -> ghi action LOGIN_SUCCESS
- Đăng nhập thất bại -> ghi action LOGIN_FAILED
- Đăng xuất thành công -> ghi action LOGOUT
- Lưu thông tin actor nếu có (user_id/username/full_name)

**Tiêu chí nghiệm thu**:
- Mỗi sự kiện auth tạo 1 dòng log kèm thời gian.

---

### BE-06: Ghi logs cho nghiệp vụ product và import
**Mục tiêu**: Có dữ liệu nghiệp vụ để agent hỏi đáp.

**Yêu cầu**:
- Product actions:
  - PRODUCT_CREATE
  - PRODUCT_UPDATE
  - PRODUCT_DELETE
- Import action:
  - IMPORT_CREATE khi tạo phiếu nhập
- Không thay đổi business flow hiện có của product/import.

**Tiêu chí nghiệm thu**:
- Mỗi action tạo đúng 1 dòng log tương ứng.

---

### BE-07: Xác thực schema history_import
**Mục tiêu**: Đảm bảo tool agent truy vấn lịch sử nhập đúng.

**Yêu cầu**:
- Đảm bảo bảng history_import có tối thiểu:
  - history_id
  - product_id
  - product_name
  - category_id
  - unit
  - purchase_price
  - quantity
  - image
  - description
  - created_at
- Đảm bảo join với product và product_category hợp lệ.

**Tiêu chí nghiệm thu**:
- Truy vấn lịch sử nhập theo tháng/năm trả kết quả nhất quán.

---

### BE-08: Test backend
**Mục tiêu**: Tránh lỗi hồi quy.

**Yêu cầu**:
- Bổ sung test cho:
  - đăng nhập thành công/thất bại
  - đăng xuất
  - /api/auth/me (200 và 401)
  - ghi log theo từng action

**Tiêu chí nghiệm thu**:
- Tất cả test mới pass.
- Hành vi auth cũ vẫn ổn định.

---

## Công việc cho Team Frontend

### FE-01: Tạo auth state dùng chung
**Mục tiêu**: Quản lý thông tin người dùng đang đăng nhập trên toàn UI.

**Yêu cầu**:
- Tạo state auth dùng chung (Context/Store).
- Lưu các trường:
  - user_id
  - username
  - full_name
  - role

**Tiêu chí nghiệm thu**:
- Sau đăng nhập, thông tin user sử dụng được trên toàn app.

---

### FE-02: Khôi phục session khi tải lại trang
**Mục tiêu**: Reload trang vẫn giữ trạng thái đăng nhập.

**Yêu cầu**:
- Khi app khởi động, gọi GET /api/auth/me
- Nếu 200 -> nạp lại auth state.
- Nếu 401 -> xóa state và điều hướng về /login.

**Tiêu chí nghiệm thu**:
- Refresh ở trang bảo vệ vẫn giữ được user nếu session còn hạn.

---

### FE-03: Hiển thị ô thông tin người đăng nhập
**Mục tiêu**: Hiển thị rõ tài khoản hiện tại trên giao diện.

**Yêu cầu**:
- Thêm ô hiển thị user ở layout (sidebar hoặc header).
- Hiển thị:
  - full_name (fallback sang username)
  - role

**Tiêu chí nghiệm thu**:
- Các trang bảo vệ đều hiển thị đúng danh tính user.

---

### FE-04: Chuẩn hóa luồng đăng xuất
**Mục tiêu**: Đăng xuất đúng cả phía server và client.

**Yêu cầu**:
- Nút đăng xuất phải gọi API logout backend.
- Khi thành công:
  - clear auth state
  - redirect /login

**Tiêu chí nghiệm thu**:
- Sau đăng xuất, /api/auth/me trả 401.
- Không truy cập được route bảo vệ.

---

### FE-05: Route guard cho trang bảo vệ
**Mục tiêu**: Chặn truy cập trái phép.

**Yêu cầu**:
- Bảo vệ các route như /dashboard và /qlhh.
- Nếu không có session hợp lệ -> redirect /login.

**Tiêu chí nghiệm thu**:
- Truy cập trực tiếp URL trang bảo vệ khi chưa auth sẽ bị chặn.

---

### FE-06: Xử lý UX lỗi xác thực
**Mục tiêu**: Xử lý mềm khi session hết hạn.

**Yêu cầu**:
- Thêm cơ chế xử lý thống nhất cho response 401.
- Hiển thị thông báo thân thiện và redirect đăng nhập khi cần.

**Tiêu chí nghiệm thu**:
- Không còn trạng thái vô định khi session hết hạn.

---

## Hợp đồng dữ liệu liên team (bắt buộc cho SPS Agent tools)

### Dữ liệu log mà agent kỳ vọng
- Tool log của agent đọc theo ưu tiên:
  - actor: full_name -> username -> user_id
  - nội dung hành động: action -> activity -> description
  - thời gian: created_at (hoặc timestamp fallback)

### Dữ liệu import mà agent kỳ vọng
- Tool import của agent phụ thuộc vào:
  - history_import.created_at để lọc theo tháng/năm
  - history_import.quantity, purchase_price, unit
  - JOIN product.product_code
  - JOIN product_category.category_name

---

## Định nghĩa hoàn thành (Definition of Done)
1. Đăng nhập thành công:
- Frontend hiển thị đúng tên user và role.
- Vẫn gửi thông báo đăng nhập Telegram.
- log có bản ghi LOGIN_SUCCESS.

2. Đăng nhập thất bại:
- log có bản ghi LOGIN_FAILED.

3. Đăng xuất:
- Session bị hủy.
- log có bản ghi LOGOUT.
- Frontend về login và route bảo vệ bị chặn.

4. Tạo phiếu nhập:
- history_import có bản ghi mới.
- log có bản ghi IMPORT_CREATE.

5. Kiểm chứng agent:
- Agent trả lời được câu hỏi về login/action logs.
- Agent trả lời được câu hỏi về lịch sử nhập theo tháng.

---

## Ghi chú
- Không xóa logic backend thông báo đăng nhập Telegram hiện tại.
- Không đưa logic ghi log sang frontend.
- Giữ tên action nhất quán để lọc và báo cáo.
