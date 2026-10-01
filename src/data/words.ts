export interface WordEntry {
  word: string
  hint: string
}

export interface Category {
  id: string
  name: string
  icon: string
  words: WordEntry[]
}

export const CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'Ẩm thực',
    icon: '🍜',
    words: [
      { word: 'Phở', hint: 'Món nước' },
      { word: 'Bánh mì', hint: 'Bữa sáng' },
      { word: 'Bún chả', hint: 'Hà Nội' },
      { word: 'Cơm tấm', hint: 'Sài Gòn' },
      { word: 'Bánh chưng', hint: 'Ngày Tết' },
      { word: 'Gỏi cuốn', hint: 'Rau sống' },
      { word: 'Trà sữa', hint: 'Ống hút' },
      { word: 'Cà phê sữa đá', hint: 'Tỉnh táo' },
      { word: 'Lẩu', hint: 'Quây quần' },
      { word: 'Bánh xèo', hint: 'Giòn rụm' },
      { word: 'Kem', hint: 'Mùa hè' },
      { word: 'Pizza', hint: 'Hình tròn' },
    ],
  },
  {
    id: 'places',
    name: 'Địa điểm',
    icon: '📍',
    words: [
      { word: 'Bệnh viện', hint: 'Áo trắng' },
      { word: 'Trường học', hint: 'Tiếng trống' },
      { word: 'Sân bay', hint: 'Hành lý' },
      { word: 'Bãi biển', hint: 'Cát' },
      { word: 'Rạp chiếu phim', hint: 'Bỏng ngô' },
      { word: 'Thư viện', hint: 'Yên lặng' },
      { word: 'Chợ', hint: 'Mặc cả' },
      { word: 'Phòng gym', hint: 'Mồ hôi' },
      { word: 'Sở thú', hint: 'Chuồng' },
      { word: 'Nhà hàng', hint: 'Thực đơn' },
      { word: 'Ngân hàng', hint: 'Xếp hàng' },
      { word: 'Công viên', hint: 'Ghế đá' },
    ],
  },
  {
    id: 'animals',
    name: 'Động vật',
    icon: '🐾',
    words: [
      { word: 'Con mèo', hint: 'Lười biếng' },
      { word: 'Con chó', hint: 'Trung thành' },
      { word: 'Con voi', hint: 'To lớn' },
      { word: 'Con khỉ', hint: 'Leo trèo' },
      { word: 'Cá heo', hint: 'Thông minh' },
      { word: 'Con gà', hint: 'Buổi sáng' },
      { word: 'Chim cánh cụt', hint: 'Lạnh giá' },
      { word: 'Con rắn', hint: 'Trườn' },
      { word: 'Con trâu', hint: 'Đồng ruộng' },
      { word: 'Hươu cao cổ', hint: 'Ngọn cây' },
      { word: 'Con ong', hint: 'Ngọt ngào' },
      { word: 'Cá mập', hint: 'Đại dương' },
    ],
  },
  {
    id: 'objects',
    name: 'Đồ vật',
    icon: '🧳',
    words: [
      { word: 'Điện thoại', hint: 'Màn hình' },
      { word: 'Cái ô', hint: 'Thời tiết' },
      { word: 'Bàn chải đánh răng', hint: 'Buổi sáng' },
      { word: 'Gương', hint: 'Phản chiếu' },
      { word: 'Đồng hồ', hint: 'Thời gian' },
      { word: 'Chìa khóa', hint: 'Cánh cửa' },
      { word: 'Gối', hint: 'Giấc ngủ' },
      { word: 'Kính mắt', hint: 'Khuôn mặt' },
      { word: 'Ví tiền', hint: 'Túi quần' },
      { word: 'Quạt điện', hint: 'Mát mẻ' },
      { word: 'Nồi cơm điện', hint: 'Nhà bếp' },
      { word: 'Ba lô', hint: 'Đeo vai' },
    ],
  },
  {
    id: 'jobs',
    name: 'Nghề nghiệp',
    icon: '💼',
    words: [
      { word: 'Bác sĩ', hint: 'Sức khỏe' },
      { word: 'Giáo viên', hint: 'Bảng đen' },
      { word: 'Đầu bếp', hint: 'Mùi vị' },
      { word: 'Lập trình viên', hint: 'Bàn phím' },
      { word: 'Cảnh sát', hint: 'Còi' },
      { word: 'Phi công', hint: 'Bầu trời' },
      { word: 'Ca sĩ', hint: 'Sân khấu' },
      { word: 'Nông dân', hint: 'Mùa vụ' },
      { word: 'Thợ cắt tóc', hint: 'Cây kéo' },
      { word: 'Shipper', hint: 'Giao hàng' },
      { word: 'Nhiếp ảnh gia', hint: 'Khoảnh khắc' },
      { word: 'Lính cứu hỏa', hint: 'Khẩn cấp' },
    ],
  },
  {
    id: 'activities',
    name: 'Hoạt động',
    icon: '🎉',
    words: [
      { word: 'Đá bóng', hint: 'Đồng đội' },
      { word: 'Hát karaoke', hint: 'Micro' },
      { word: 'Cắm trại', hint: 'Ngoài trời' },
      { word: 'Bơi lội', hint: 'Ướt' },
      { word: 'Câu cá', hint: 'Kiên nhẫn' },
      { word: 'Đi chùa', hint: 'Thanh tịnh' },
      { word: 'Chơi game', hint: 'Màn hình' },
      { word: 'Nấu ăn', hint: 'Gia vị' },
      { word: 'Đám cưới', hint: 'Phong bì' },
      { word: 'Du lịch', hint: 'Chuyến đi' },
      { word: 'Leo núi', hint: 'Độ cao' },
      { word: 'Xem phim', hint: 'Cốt truyện' },
    ],
  },
]
