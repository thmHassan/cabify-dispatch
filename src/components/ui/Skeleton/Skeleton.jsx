import { forwardRef } from 'react'
import classNames from 'classnames'

const Skeleton = forwardRef((props, ref) => {
    const {
        animation = true,
        asElement: Component = 'span',
        className,
        height,
        style,
        variant = 'block',
        width,
    } = props

    return (
        <Component
            ref={ref}
            className={classNames(
                'skeleton',
                variant === 'circle' && 'skeleton-circle',
                variant === 'block' && 'skeleton-block',
                animation && 'animate-pulse',
                className
            )}
            style={{
                width,
                height,
                ...style,
            }}
        />
    )
})

Skeleton.displayName = 'Skeleton'

export default Skeleton