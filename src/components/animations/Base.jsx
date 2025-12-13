import { motion } from "framer-motion";

const Base = ({ children, ...rest }) => {
    const MotionDiv = motion.div;
    return <MotionDiv {...rest}>{children}</MotionDiv>;
};

export default Base;
