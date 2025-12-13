import { forwardRef } from 'react'
import classNames from 'classnames'
import { CgSpinner } from 'react-icons/cg'
// import { useConfig } from '../ConfigProvider'

const Spinner = forwardRef((props, ref) => {
    const {
        className,
        color,
        enableTheme = true,
        indicator: Component = CgSpinner,
        isSpining = true,
        size = 20,
        style,
        ...rest
    } = props

    // const { themeColor, primaryColorLevel } = useConfig()

    const spinnerColor =
        color || (enableTheme && `paolo_veronese_green-100-0`)

    const spinnerStyle = {
        height: size,
        width: size,
        ...style,
    }

    const spinnerClass = classNames(
        isSpining && 'animate-spin',
        spinnerColor && `text-${spinnerColor}`,
        className
    )

    return (
        <Component
            ref={ref}
            style={spinnerStyle}
            className={spinnerClass}
            {...rest}
        />
    )
})

Spinner.displayName = 'Spinner'

export default Spinner