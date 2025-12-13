import { animate, useMotionValue } from "framer-motion";
import { useEffect, useState } from "react";
import { CircularProgressbar } from "react-circular-progressbar";

const AnimatedProgressbar = ({ value = 60, duration = 0.5, styles }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const motionValue = useMotionValue(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });

    return controls.stop; // Cleanup
  }, [value, duration]);

  return (
    <CircularProgressbar
      value={displayValue}
      text={`${displayValue}%`}
      styles={styles}
    />
  );
};

export default AnimatedProgressbar;
