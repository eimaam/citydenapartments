import { ConfigProvider, Progress as AntdProgress } from 'antd'
import type { ComponentProps } from 'react'

interface IProgress extends ComponentProps<typeof AntdProgress> {
  showInfo: boolean
}

const ProgressLine = (props: IProgress) => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorText: 'var(--color-on-surface-variant)',
          colorPrimary: 'var(--color-primary)',
          colorFillSecondary: 'var(--color-surface-container-high)',
        },
      }}
    >
      <div>
        <AntdProgress {...props} />
      </div>
    </ConfigProvider>
  )
}

export default ProgressLine