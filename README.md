# GeoChain – Phường An Hội, tỉnh Vĩnh Long

WebGIS nghiên cứu kết hợp **MapLibre + H3 + Algorand** để tra cứu thửa đất từ KMZ của người dùng. Tệp đầu vào chứa **3.963 polygon** (mã xã 28777). Giao diện hiển thị thửa và lưới H3 10–13, tìm thửa, mã tờ, diện tích, loại đất và tạo SHA-256 cục bộ.

## Dữ liệu

Bản nguồn `28777 - Phường An Hội (đã nhập phường 1, 2 và 3).kmz` đã được chuyển thành `data/an-hoi-parcels.geojson` trong gói ZIP bàn giao ngoài repository. Dữ liệu **chưa được đưa lên repo công khai** vì cần xác nhận quyền công bố. Sau khi có quyền, đặt GeoJSON vào đúng đường dẫn để GitHub Pages tải được.

## Hạn chế

H3 là chỉ mục không gian, không thay thế ranh giới địa chính. Dữ liệu chưa được chứng thực bởi cơ quan quản lý đất đai. SHA-256 hiện được tạo cục bộ, **không có giao dịch Algorand TestNet hay Transaction ID thật**. Không đưa thông tin chủ sở hữu hoặc dữ liệu bí mật lên blockchain.

## Triển khai

GitHub Pages: chọn Deploy from a branch → main → / (root). Chạy máy local bằng `python -m http.server 8000`.

Thiết kế: Long Ngo · mã nguồn MIT. Giấy phép dữ liệu cần xác nhận riêng.