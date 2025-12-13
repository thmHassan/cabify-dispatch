import { forwardRef } from 'react'
import classNames from 'classnames'

const Th = forwardRef((props, ref) => {
    const { asElement: Component = 'th', children, className, ...rest } = props

    const thClass = classNames(Component !== 'th' && 'th', className)

    return (
        <Component className={thClass} {...rest} ref={ref}>
            {children}
        </Component>
    )
})

Th.displayName = 'Th'

export default Th