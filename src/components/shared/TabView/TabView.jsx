import { AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import Button from "../../ui/Button/Button";
import Base from "../../animations/Base";
import Tag from "../../ui/Tag";
import classNames from "classnames";
import { setTabViewScreen } from "../../../store";

const ALIGN_CONFIG = {
  left: "flex-start",
  right: "flex-end",
  center: "justify-start",
};

const TabView = ({ align = "center", tabs, onTabChange, ...rest }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const previousTabRef = useRef(0);

  const { component: CurrentTab, ...restProps } = tabs[currentTab];

  const handleTabChange = (index, title) => {
    previousTabRef.current = currentTab;
    setTabViewScreen({ tabViewScreen: title || "" });
    setCurrentTab(index);
  };

  const goToNextTab = () => {
    console.log("object");
    if (currentTab < tabs.length - 1) {
      handleTabChange(currentTab + 1, tabs[currentTab + 1]?.title);
    }
  };

  const goToPrevTab = () => {
    if (currentTab > 0) {
      handleTabChange(currentTab - 1, tabs[currentTab - 1]?.title);
    }
  };

  const direction = currentTab > previousTabRef.current ? 1 : -1;

  return (
    <div>
      <div
        className={classNames(
          "flex w-full sm:gap-3 gap-2 lg:gap-5 mb-5 sm:mb-[52px] sm:px-2 overflow-x-auto whitespace-nowrap",
          ALIGN_CONFIG[align]
        )}
      >
        {tabs.map(({ title }, index) => (
          <Button
            key={index}
            onClick={() => {
              if (onTabChange) onTabChange(index);
              handleTabChange(index, title);
            }}
            className="min-w-max"
          >
            <Tag
              variant={currentTab === index ? "blue" : "gray"}
              size="lg"
              className="text-sm leading-[19px] !px-5 !pt-1.5 pb-[5px] rounded-[25px] sm:text-[18px] sm:leading-[25px] sm:!px-[35px] sm:!pt-[11px] sm:!pb-2.5 sm:rounded-[35px]"
            >
              {title}
            </Tag>
          </Button>
        ))}
      </div>

      <div className="w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <Base
            key={currentTab}
            initial={{ opacity: 0, x: 50 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 * direction }}
            transition={{ duration: 0.3 }}
          >
            {/* 👇 Pass navigation helpers */}
            <CurrentTab
              {...rest}
              {...restProps}
              goToNextTab={goToNextTab}
              goToPrevTab={goToPrevTab}
              currentTab={currentTab}
            />
          </Base>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TabView;
