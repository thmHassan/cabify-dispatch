const AppRoute = ({
  component,
  ...props
}) => {
  const AppComponent = component;
  return <AppComponent {...(props)} />;
};

export default AppRoute;
