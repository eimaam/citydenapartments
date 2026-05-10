import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface FadeInProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
    yOffset?: number;
    blur?: boolean;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export const FadeIn = ({
    children,
    className,
    delay = 0,
    duration = 0.5,
    yOffset = 24,
    blur = false,
    direction = 'up'
}: FadeInProps) => {
    const getInitial = () => {
        switch (direction) {
            case 'up': return { opacity: 0, y: yOffset };
            case 'down': return { opacity: 0, y: -yOffset };
            case 'left': return { opacity: 0, x: yOffset };
            case 'right': return { opacity: 0, x: -yOffset };
            case 'none': return { opacity: 0 };
            default: return { opacity: 0, y: yOffset };
        }
    };

    return (
        <motion.div
            initial={{ ...getInitial(), filter: blur ? 'blur(8px)' : 'blur(0px)' }}
            whileInView={{ opacity: 1, y: 0, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: false, margin: "-50px" }}
            transition={{
                duration,
                delay,
                ease: [0.25, 0.25, 0, 1] 
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export const FadeInStagger = ({ children, className, faster = false }: { children: ReactNode, className?: string, faster?: boolean }) => {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
                visible: {
                    transition: {
                        staggerChildren: faster ? 0.05 : 0.1
                    }
                }
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export const FadeInItem = ({ children, className }: { children: ReactNode, className?: string }) => {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                        duration: 0.5
                    }
                }
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};
