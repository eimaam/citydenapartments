import { Button } from './ui/Button'
import { FadeInItem } from './ui/FadeIn'
import { Divider, Layout } from 'antd'
import { Link } from 'react-router-dom'
import { MotionDiv } from './ui/MotionComponents'
import { MdDashboard } from "react-icons/md";
import { MdOutlineSupportAgent } from "react-icons/md";
import { TbError404Off } from "react-icons/tb";

const ErrorPage = () => {
  return (
    <Layout className="flex flex-col items-center justify-center gap-4 md:gap-6 px-2 min-h-svh bg-background type-body-md text-on-surface">
      <MotionDiv
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{
          duration: 0.5,
          delay: 0.2,
          ease: [0.25, 0.25, 0, 1]
        }}
        className="flex flex-col items-center"
      >
        <h1 className="text-primary leading-none">
          <span className="inline-flex max-w-full text-primary" aria-hidden>
            <TbError404Off size={300} />
          </span>
        </h1>
        <p className="-mt-4 z-10 text-center tracking-widest type-body-md md:type-body-lg uppercase font-bold text-on-surface-variant">
          Page Not Found
        </p>
      </MotionDiv>
      <FadeInItem>
        <p className="z-10 type-body-md md:type-body-lg text-on-surface-variant italic font-normal leading-relaxed text-center tracking-wide max-w-md">
          It seems the page you are looking for has been moved or deleted. Let&apos;s get you back on track.
        </p>
      </FadeInItem>
      <div className="flex gap-4 items-center justify-center flex-wrap">
        <Link to="/">
          <Button
            size="lg"
            className="mt-4 !bg-secondary !text-on-secondary"
            icon={<MdDashboard size={24} />}
          >
            Back to Dashboard
          </Button>
        </Link>
        <Link to="/contact">
          <Button size="lg" variant="outline" className="mt-4" icon={<MdOutlineSupportAgent size={24} />}>
            Contact Support
          </Button>
        </Link>
      </div>

      <Divider className="w-1/2 border-outline-variant" />
    </Layout>
  )
}

export default ErrorPage
