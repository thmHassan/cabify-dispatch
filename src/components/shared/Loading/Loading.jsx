import classNames from "classnames";
import Spinner from "../../ui/Spinner";

const DefaultLoading = (props) => {
  const {
    loading,
    children,
    spinnerClass,
    className,
    asElement: Component = "div",
    customLoader,
  } = props;

  return loading ? (
    <Component
      className={classNames(
        !customLoader && "flex items-center justify-center h-full",
        className
      )}
    >
      {customLoader ? (
        <>{customLoader}</>
      ) : (
        <Spinner className={spinnerClass} size={40} />
      )}
    </Component>
  ) : (
    <>{children}</>
  );
};

const CoveredLoading = (props) => {
  const {
    loading,
    children,
    spinnerClass,
    className,
    asElement: Component = "div",
    customLoader,
  } = props;

  return (
    <Component className={classNames(loading ? "relative" : "", className)}>
      {children}
      {loading && (
        <div className="w-full h-full bg-white absolute inset-0" />
      )}
      {loading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          {customLoader ? (
            <>{customLoader}</>
          ) : (
            <Spinner className={spinnerClass} size={40} />
          )}
        </div>
      )}
    </Component>
  );
};

const FullScreenLoading = (props) => {
  const {
    loading,
    children,
    spinnerClass,
    className,
    asElement: Component = "div",
    customLoader,
  } = props;

  return (
    <Component className={classNames(loading ? "relative" : "", className)}>
      {children}
      {loading && (
        <div className="fixed inset-0 w-screen h-screen bg-white z-50 flex items-center justify-center">
          {customLoader ? (
            <>{customLoader}</>
          ) : (
            <Spinner className={spinnerClass} size={40} />
          )}
        </div>
      )}
    </Component>
  );
};

const Loading = ({ type, ...rest }) => {
  switch (type) {
    case "default":
      return <DefaultLoading {...rest} />;
    case "cover":
      return <CoveredLoading {...rest} />;
    case "fullscreen":
      return <FullScreenLoading {...rest} />;
    default:
      return <DefaultLoading {...rest} />;
  }
};

Loading.defaultProps = {
  loading: false,
  type: "default",
  asElement: "div",
};

export default Loading;
