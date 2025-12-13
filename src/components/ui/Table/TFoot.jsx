import { forwardRef } from 'react'
import classNames from 'classnames'

const TFoot = forwardRef((props, ref) => {
    const {
        asElement: Component = 'tfoot',
        children,
        className,
        ...rest
    } = props

    const tBodyClass = classNames(Component !== 'tfoot' && 'tfoot', className)

    return (
        <Component className={tBodyClass} {...rest} ref={ref}>
            {children}
        </Component>
    )
})

TFoot.displayName = 'TFoot'

export default TFoot