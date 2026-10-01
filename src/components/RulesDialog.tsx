import { Modal } from './Modal'

export function RulesDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Luật chơi" onClose={onClose}>
      <ol className="rules">
        <li>
          <strong>Chuẩn bị.</strong> Chọn số người chơi (3–12) và số Kẻ Mạo Danh, rồi điền tên từng người. Chọn chủ đề,
          thời gian thảo luận, và có thể bật “Gợi ý cho Kẻ Mạo Danh” để ván chơi cân bằng hơn.
        </li>
        <li>
          <strong>Xem vai trò.</strong> Lần lượt truyền máy. Mỗi người nhấn giữ thẻ để xem bí mật của mình rồi thả ra
          để che lại. Phe dân nhận <em>cùng một từ bí mật</em>. <em>Kẻ Mạo Danh</em> chỉ biết chủ đề (và một gợi ý nếu
          được bật), và không biết ai là đồng bọn.
        </li>
        <li>
          <strong>Mô tả.</strong> Theo thứ tự hiển thị, mỗi người nói một từ hoặc một câu ngắn liên quan đến từ bí mật.
          Đừng quá lộ liễu, kẻo Kẻ Mạo Danh đoán ra!
        </li>
        <li>
          <strong>Thảo luận.</strong> Khi đồng hồ chạy, cả nhóm tranh luận xem ai đang “nói cho có”. Kẻ Mạo Danh phải
          giả vờ như mình biết từ.
        </li>
        <li>
          <strong>Bỏ phiếu.</strong> Lần lượt truyền máy, mỗi người còn trong ván bỏ phiếu kín cho người mình nghi ngờ
          (không tự bầu cho mình). Người nhiều phiếu nhất bị loại và lộ vai trò; nếu hòa phiếu thì không ai bị loại.
        </li>
        <li>
          <strong>Điều kiện thắng.</strong> Ván chơi kéo dài nhiều vòng. <em>Phe dân thắng</em> khi loại hết Kẻ Mạo
          Danh. <em>Kẻ Mạo Danh thắng</em> khi số Kẻ Mạo Danh còn lại bằng hoặc nhiều hơn số dân.
        </li>
      </ol>
      <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
        Đã hiểu
      </button>
    </Modal>
  )
}
