import { TaxConfigurationSetup } from './TaxConfigurationSetup';

interface TaxConfigurationWrapperProps {
  userName: string;
  compact?: boolean;
  hideAudit?: boolean;
}

export function TaxConfigurationWrapper({ userName, compact = false, hideAudit = false }: TaxConfigurationWrapperProps) {
  return <TaxConfigurationSetup userName={userName} compact={compact} hideAudit={hideAudit} />;
}
