const STEPS = [
  {
    icon: '👁️',
    title: 'Xem vai trò',
    text: 'Truyền máy lần lượt. Nhấn giữ thẻ để xem bí mật, rồi thả ra để che lại.',
  },
  {
    icon: '💬',
    title: 'Mô tả',
    text: 'Mỗi người nói một từ hoặc một câu ngắn về từ bí mật — vừa đủ để đồng đội hiểu.',
  },
  {
    icon: '⏱️',
    title: 'Thảo luận',
    text: 'Nghe cho kỹ. Kẻ Mạo Danh phải giả vờ như mình cũng biết từ đó.',
  },
  {
    icon: '🗳️',
    title: 'Bỏ phiếu',
    text: 'Bỏ phiếu kín. Người nhiều phiếu nhất bị loại và lộ vai trò.',
  },
] as const

interface IntroScreenProps {
  onPlay: () => void
  onOnlinePlay: () => void
}

export function IntroScreen({ onPlay, onOnlinePlay }: IntroScreenProps) {
  return (
    <section className="screen intro">
      <header className="intro-hero">
        <p className="intro-kicker">3–12 người · một máy</p>
        <h2 className="intro-title">Ai đang giả vờ biết từ?</h2>
        <p className="intro-lead">
          Cả nhóm nhận <em>cùng một từ bí mật</em> — trừ Kẻ Mạo Danh. Họ chỉ biết chủ đề, rồi phải hòa vào cuộc nói
          chuyện mà không bị lộ.
        </p>
      </header>

      <ol className="intro-flow">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <span className="intro-icon" aria-hidden="true">
              {step.icon}
            </span>
            <div>
              <h3>
                <span className="intro-step-num">{index + 1}.</span> {step.title}
              </h3>
              <p className="muted small">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="intro-outcomes">
        <article className="intro-outcome crew">
          <strong>Phe dân thắng</strong>
          <p className="muted small">Khi loại hết Kẻ Mạo Danh.</p>
        </article>
        <article className="intro-outcome imposter">
          <strong>Kẻ Mạo Danh thắng</strong>
          <p className="muted small">Khi số họ còn lại bằng hoặc nhiều hơn dân.</p>
        </article>
      </div>

      <div className="sticky-actions intro-actions">
        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={onPlay}>
          Chuyển điện thoại
        </button>
        <button type="button" className="btn btn-ghost btn-block btn-lg" onClick={onOnlinePlay}>
          📡 Chơi trực tuyến
        </button>
      </div>
    </section>
  )
}
