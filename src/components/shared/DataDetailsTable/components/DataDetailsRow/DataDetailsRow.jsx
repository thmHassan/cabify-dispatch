import ApiKeyRowFields from "../ApiKeyRowFields";
import DriverDocumentsRowFields from "../DriverDocumentsRowFields";
import MapProviderRowField from "../MapProviderRowField";
import SubAdminManagementRowFields from "../SubAdminManagementRowFields";
import SubscriptionTableRow from "../SubscriptionTableRow";
import SystemAnalyticsTableRow from "../SystemAnalyticsTableRow";
import UsageMonitoringTableRow from "../UsageMonitoringTableRow";
import VehicleTypeFields from "../VehicleTypeFields";

const DataDetailsRow = ({ type = "subscription", ...props }) => {
  const TABLE_ROW_CONFIG = {
    company: (props) => <SubscriptionTableRow type={type} {...props} />,
    subscription: SubscriptionTableRow,
    usageMonitoring: UsageMonitoringTableRow,
    systemAnalytics: SystemAnalyticsTableRow,
    driverDocuments: DriverDocumentsRowFields,
    vehicleType: VehicleTypeFields,
    subAdminManagement: SubAdminManagementRowFields,
    ApiKeys: ApiKeyRowFields,
    MapProvider: MapProviderRowField,
  };

  const Row = TABLE_ROW_CONFIG[type];
  return <Row {...props} />;
};

export default DataDetailsRow;
