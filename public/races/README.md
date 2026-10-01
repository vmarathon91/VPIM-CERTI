# Thư Mục Khởi Tạo Giải Tĩnh Tự Động (Static Races API Folder)

Khi bạn ném bất kỳ file `.json` cấu hình giải đấu nào vào thư mục này (`/public/races/` hoặc `/public/static-races/`), hệ thống khi khởi động hoặc khi gọi `/api/races` sẽ:
1. Tự động quét và đọc tất cả các file `*.json` trong thư mục này.
2. Tự động phân tích các thông số giải đấu (Tên giải, URL slug, mã giải, ảnh phôi nền, Apps Script URL kết nối dữ liệu VĐV, và toạ độ căn chỉnh phôi `placements`).
3. Nếu giải chưa có trong hệ thống, hệ thống sẽ tự động sinh ra 1 giải đấu mới và đưa vào danh sách giải để người dùng có thể tra cứu theo URL `/{slug}`.
4. Nếu giải đã có, hệ thống sẽ cập nhật thông số và toạ độ phôi mới nhất từ file.

## Cách tạo file cấu hình:
- Vào trang quản trị `/admin`
- Nhấn nút **"Xuất API Tĩnh (.json)"** (hoặc nút **"Xuất Excel & API"**) trên bất kỳ giải nào.
- File tải về có tên dạng `race_api_{slug}.json` hoặc `{slug}.json`.
- Bạn có thể đổi tên và đặt trực tiếp vào thư mục `/public/races/` này.
