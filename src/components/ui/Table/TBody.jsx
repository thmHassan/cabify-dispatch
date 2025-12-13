import { forwardRef } from 'react'
import classNames from 'classnames'

const TBody = forwardRef((props, ref) => {
    const {
        asElement: Component = 'tbody',
        children,
        className,
        ...rest
    } = props

    const tBodyClass = classNames(Component !== 'tbody' && 'tbody', className)

    return (
        <Component className={tBodyClass} {...rest} ref={ref}>
            {children}
        </Component>
    )
})

TBody.displayName = 'TBody'

export default TBody