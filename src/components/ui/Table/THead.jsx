import { forwardRef } from 'react'
import classNames from 'classnames'

const THead = forwardRef((props, ref) => {
    const {
        asElement: Component = 'thead',
        children,
        className,
        ...rest
    } = props

    const tHeadClass = classNames(Component !== 'thead' && 'thead', className)

    return (
        <Component className={tHeadClass} {...rest} ref={ref}>
            {children}
        </Component>
    )
})

THead.displayName = 'THead'

export default THead