// import { useConfig } from '../ConfigProvider'
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

const Sorter = ({ sort }) => {
  // const { themeColor, primaryColorLevel } = useConfig()

  const color = `text-paolo_veronese_green-100-0`;

  const renderSort = () => {
    if (typeof sort === "boolean") {
      return <FaSort />;
    }

    if (sort === "asc") {
      return <FaSortUp className={color} />;
    }

    if (sort === "desc") {
      return <FaSortDown className={color} />;
    }

    return null;
  };

  return <div className="inline-flex">{renderSort()}</div>;
};

export default Sorter;
