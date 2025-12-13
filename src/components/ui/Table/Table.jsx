import { forwardRef } from 'react'
import classNames from 'classnames'

const Table = forwardRef((props, ref) => {
    const {
        asElement: Component = 'table',
        borderlessRow,
        children,
        className,
        compact = false,
        hoverable = true,
        overflow = true,
        ...rest
    } = props

    const tableClass = classNames(
        Component === 'table' ? 'table-default' : 'table-flex',
        hoverable && 'table-hover',
        compact && 'table-compact',
        borderlessRow && 'borderless-row',
        className
    )

    return (
        <div className={classNames(overflow && 'overflow-x-auto')}>
            <Component className={tableClass} {...rest} ref={ref}>
                {children}
            </Component>
        </div>
    )
})

Table.displayName = 'Table'

export default Table