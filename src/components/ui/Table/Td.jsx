import { forwardRef } from 'react'
import classNames from 'classnames'

const Td = forwardRef((props, ref) => {
    const { asElement: Component = 'td', children, className, ...rest } = props

    const tdClass = classNames(Component !== 'td' && 'td', className)

    return (
        <Component ref={ref} className={tdClass} {...rest}>
            {children}
        </Component>
    )
})

Td.displayName = 'Td'

export default Td