import { useState, useEffect } from 'react';
import {
  Receipt,
  Percent,
  Banknote,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Shield,
  CreditCard,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';

interface FixedTaxConfiguration {
  id: string;
  configName: string;
  description: string;
  fixedChargeAmount: number; // The fixed venue charge (50,000 or 100,000)
  praTaxRate: number; // PRA Tax percentage (e.g., 5%)
  whtRate: number; // Withholding Tax percentage (e.g., 10%)
  isActive: boolean;
  requiresCNIC: boolean; // Whether CNIC is required for WHT deposit
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

interface FixedTaxConfigurationSetupProps {
  userName: string;
}

export function FixedTaxConfigurationSetup({ userName }: FixedTaxConfigurationSetupProps) {
  const [configurations, setConfigurations] = useState<FixedTaxConfiguration[]>([
    {
      id: '1',
      configName: 'Prime Space Tax - PKR 100,000',
      description: 'Tax configuration for prime spaces with PKR 100,000 fixed charge',
      fixedChargeAmount: 100000,
      praTaxRate: 5,
      whtRate: 10,
      isActive: true,
      requiresCNIC: true,
      createdAt: new Date('2024-01-01'),
      createdBy: 'Admin',
    },
    {
      id: '2',
      configName: 'Sub Space Tax - PKR 50,000',
      description: 'Tax configuration for sub spaces with PKR 50,000 fixed charge',
      fixedChargeAmount: 50000,
      praTaxRate: 5,
      whtRate: 10,
      isActive: true,
      requiresCNIC: true,
      createdAt: new Date('2024-01-01'),
      createdBy: 'Admin',
    },
  ]);

  const [activeConfig, setActiveConfig] = useState<FixedTaxConfiguration | null>(configurations[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreateNew = () => {
    const newConfig: FixedTaxConfiguration = {
      id: `tax-${Date.now()}`,
      configName: 'New Tax Configuration',
      description: '',
      fixedChargeAmount: 50000,
      praTaxRate: 5,
      whtRate: 10,
      isActive: true,
      requiresCNIC: true,
      createdAt: new Date(),
      createdBy: userName,
    };
    setActiveConfig(newConfig);
    setIsCreating(true);
  };

  const handleSave = () => {
    if (!activeConfig) return;

    if (isCreating) {
      setConfigurations([...configurations, activeConfig]);
    } else {
      setConfigurations(configurations.map(c => 
        c.id === activeConfig.id ? { ...activeConfig, updatedAt: new Date(), updatedBy: userName } : c
      ));
    }
    setActiveConfig(null);
    setIsCreating(false);
    setEditingId(null);
  };

  const handleEdit = (config: FixedTaxConfiguration) => {
    setActiveConfig({ ...config });
    setEditingId(config.id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this tax configuration?')) {
      setConfigurations(configurations.filter(c => c.id !== id));
      if (activeConfig?.id === id) {
        setActiveConfig(configurations[0] || null);
      }
    }
  };

  const calculateTaxBreakdown = (fixedCharge: number, praTax: number, wht: number) => {
    const praTaxAmount = (fixedCharge * praTax) / 100;
    const whtAmount = (fixedCharge * wht) / 100;
    const totalTaxAmount = praTaxAmount + whtAmount;

    return {
      fixedCharge,
      praTaxAmount,
      whtAmount,
      totalTaxAmount,
    };
  };

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white rounded-lg p-4 border-2 border-indigo-700">
        <div className="flex items-start gap-3">
          <Receipt className="size-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg mb-1">Fixed Tax Configuration</h3>
            <p className="text-sm text-indigo-100 mb-2">
              Tax is calculated ONLY on fixed venue charges. All outsourced services (menu, décor, lighting, etc.) 
              are tax-exempt for guest convenience. WHT deposited against guest CNIC for advance tax claims.
            </p>
            <div className="flex items-center gap-2 text-xs bg-white/10 rounded px-3 py-1.5 w-fit">
              <Shield className="size-3" />
              <span>Fixed venue charges not shown in reservation - only total fixed tax amount is charged</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-280px)] flex gap-5">
        {/* Left Panel - Configuration List */}
        <div className="w-80 bg-white rounded-lg border-2 border-gray-300 shadow-lg flex flex-col">
          <div className="p-4 border-b-2 border-gray-300 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#2E2E2E] flex items-center gap-2">
                <Receipt className="size-5 text-indigo-600" />
                Tax Configurations ({configurations.length})
              </h3>
            </div>
            <Button
              onClick={handleCreateNew}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="size-4 mr-2" />
              New
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {configurations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Receipt className="size-12 text-gray-300 mx-auto mb-2" />
                <p>No configurations</p>
                <p className="text-xs mt-1">Click "New" to create</p>
              </div>
            ) : (
              configurations.map(config => {
                const breakdown = calculateTaxBreakdown(config.fixedChargeAmount, config.praTaxRate, config.whtRate);
                
                return (
                  <div
                    key={config.id}
                    onClick={() => {
                      if (!isCreating && !editingId) {
                        setActiveConfig(config);
                      }
                    }}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all mb-2 ${
                      activeConfig?.id === config.id
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    } ${(isCreating || editingId) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-[#2E2E2E] mb-1">
                          {config.configName}
                        </h4>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono bg-white px-1.5 py-0.5 rounded border">
                            Fixed: PKR {config.fixedChargeAmount.toLocaleString()}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              config.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {config.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                        PRA: {config.praTaxRate}%
                      </div>
                      <div className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">
                        WHT: {config.whtRate}%
                      </div>
                    </div>
                    <div className="text-sm font-bold text-indigo-700 pt-2 border-t">
                      Total Tax: PKR {breakdown.totalTaxAmount.toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel - Configuration Details */}
        <div className="flex-1 bg-white rounded-lg border-2 border-gray-300 shadow-lg flex flex-col">
          {!activeConfig ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Receipt className="size-16 text-gray-300 mx-auto mb-3" />
                <p className="text-sm">Select a configuration to view details</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-5 border-b-2 border-gray-300 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Receipt className="size-5 text-indigo-600" />
                      <h2 className="text-xl font-semibold text-[#2E2E2E]">
                        {isCreating ? 'Create New Tax Configuration' : activeConfig.configName}
                      </h2>
                    </div>
                    {!isCreating && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>Created by {activeConfig.createdBy} on {activeConfig.createdAt.toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(isCreating || editingId === activeConfig.id) ? (
                      <>
                        <Button
                          onClick={handleSave}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="size-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setActiveConfig(configurations[0] || null);
                            setIsCreating(false);
                            setEditingId(null);
                          }}
                          variant="outline"
                        >
                          <X className="size-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleEdit(activeConfig)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Edit2 className="size-4 mr-2" />
                          Edit
                        </Button>
                        {!isCreating && (
                          <Button
                            onClick={() => handleDelete(activeConfig.id)}
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl space-y-6">
                  {/* Information */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-2">How Fixed Tax Works:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• Tax calculated ONLY on fixed venue charge (not shown in reservation)</li>
                          <li>• Only the <strong>Total Fixed Tax Amount</strong> appears in reservation form</li>
                          <li>• All outsourced services (menu, décor, lights, generator, crockery) are tax-exempt</li>
                          <li>• WHT deposited against guest CNIC for advance tax claims</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="border-2 border-gray-200 rounded-lg p-5 bg-gray-50 space-y-4">
                    <h3 className="font-semibold text-[#2E2E2E] flex items-center gap-2 pb-2 border-b border-gray-300">
                      <Receipt className="size-5 text-blue-600" />
                      Basic Information
                    </h3>

                    <div>
                      <Label className="text-sm mb-1.5 font-semibold">
                        Configuration Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={activeConfig.configName}
                        onChange={(e) => setActiveConfig({ ...activeConfig, configName: e.target.value })}
                        placeholder="e.g., Prime Space Tax - PKR 100,000"
                        disabled={!isCreating && editingId !== activeConfig.id}
                        className={`${!isCreating && editingId !== activeConfig.id ? 'bg-gray-50' : 'bg-white'} text-base`}
                      />
                    </div>

                    <div>
                      <Label className="text-sm mb-1.5 font-semibold">Description</Label>
                      <Textarea
                        value={activeConfig.description}
                        onChange={(e) => setActiveConfig({ ...activeConfig, description: e.target.value })}
                        placeholder="Internal notes about this configuration..."
                        rows={2}
                        disabled={!isCreating && editingId !== activeConfig.id}
                        className={!isCreating && editingId !== activeConfig.id ? 'bg-gray-50' : 'bg-white'}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div>
                        <Label className="text-sm font-semibold">Active Status</Label>
                        <p className="text-xs text-gray-600">Enable this configuration</p>
                      </div>
                      <Switch
                        checked={activeConfig.isActive}
                        onCheckedChange={(checked) => setActiveConfig({ ...activeConfig, isActive: checked })}
                        disabled={!isCreating && editingId !== activeConfig.id}
                      />
                    </div>
                  </div>

                  {/* Fixed Charge & Tax Rates */}
                  <div className="border-2 border-indigo-200 rounded-lg p-5 bg-indigo-50 space-y-4">
                    <h3 className="font-semibold text-[#2E2E2E] flex items-center gap-2 pb-2 border-b border-indigo-300">
                      <Banknote className="size-5 text-indigo-600" />
                      Fixed Charge & Tax Rate
                    </h3>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm mb-1.5 font-semibold flex items-center gap-2">
                          <Banknote className="size-4 text-green-600" />
                          Fixed Venue Charge <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={activeConfig.fixedChargeAmount}
                            onChange={(e) => setActiveConfig({ 
                              ...activeConfig, 
                              fixedChargeAmount: parseFloat(e.target.value) || 0 
                            })}
                            placeholder="50000"
                            className={`${!isCreating && editingId !== activeConfig.id ? 'bg-gray-50' : 'bg-white'} text-lg font-semibold pr-16`}
                            disabled={!isCreating && editingId !== activeConfig.id}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            PKR
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Base amount for tax calculation (not shown in reservation)
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm mb-1.5 font-semibold flex items-center gap-2">
                          <Percent className="size-4 text-purple-600" />
                          PRA Tax Rate <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            value={activeConfig.praTaxRate}
                            onChange={(e) => setActiveConfig({ 
                              ...activeConfig, 
                              praTaxRate: parseFloat(e.target.value) || 0 
                            })}
                            placeholder="5"
                            className={`${!isCreating && editingId !== activeConfig.id ? 'bg-gray-50' : 'bg-white'} text-lg font-semibold pr-12`}
                            disabled={!isCreating && editingId !== activeConfig.id}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            %
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          PRA/Sales tax percentage
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm mb-1.5 font-semibold flex items-center gap-2">
                          <Percent className="size-4 text-orange-600" />
                          WHT Rate <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            value={activeConfig.whtRate}
                            onChange={(e) => setActiveConfig({ 
                              ...activeConfig, 
                              whtRate: parseFloat(e.target.value) || 0 
                            })}
                            placeholder="10"
                            className={`${!isCreating && editingId !== activeConfig.id ? 'bg-gray-50' : 'bg-white'} text-lg font-semibold pr-12`}
                            disabled={!isCreating && editingId !== activeConfig.id}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            %
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Withholding tax percentage
                        </p>
                      </div>
                    </div>

                    {/* Tax Calculation Preview */}
                    {activeConfig.fixedChargeAmount > 0 && (
                      <div className="bg-white border-2 border-indigo-300 rounded-lg p-4">
                        <h4 className="font-semibold text-sm text-[#2E2E2E] mb-3 flex items-center gap-2">
                          <CheckCircle className="size-4 text-indigo-600" />
                          Tax Calculation Breakdown
                        </h4>
                        {(() => {
                          const breakdown = calculateTaxBreakdown(
                            activeConfig.fixedChargeAmount,
                            activeConfig.praTaxRate,
                            activeConfig.whtRate
                          );
                          return (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Fixed Venue Charge (Base):</span>
                                <span className="font-semibold">PKR {breakdown.fixedCharge.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm text-purple-700">
                                <span>PRA Tax ({activeConfig.praTaxRate}%):</span>
                                <span className="font-semibold">PKR {breakdown.praTaxAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm text-orange-700">
                                <span>WHT ({activeConfig.whtRate}%):</span>
                                <span className="font-semibold">PKR {breakdown.whtAmount.toLocaleString()}</span>
                              </div>
                              <div className="pt-3 border-t-2 border-indigo-300 flex justify-between">
                                <span className="font-semibold text-indigo-900">Total Fixed Tax Amount:</span>
                                <span className="font-bold text-xl text-indigo-700">PKR {breakdown.totalTaxAmount.toLocaleString()}</span>
                              </div>
                              <div className="mt-3 bg-indigo-100 rounded p-3 text-xs text-indigo-900">
                                <strong>In Reservation:</strong> Only "PKR {breakdown.totalTaxAmount.toLocaleString()}" will be shown as "Fixed Tax".
                                The fixed venue charge (PKR {breakdown.fixedCharge.toLocaleString()}) will NOT be displayed.
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* CNIC Requirement */}
                  <div className="border-2 border-orange-200 rounded-lg p-5 bg-orange-50">
                    <h3 className="font-semibold text-[#2E2E2E] flex items-center gap-2 pb-2 border-b border-orange-300 mb-4">
                      <CreditCard className="size-5 text-orange-600" />
                      CNIC Requirement for WHT
                    </h3>
                    
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-orange-300">
                      <div className="flex items-center gap-3">
                        <Shield className="size-6 text-orange-600" />
                        <div>
                          <Label className="text-sm font-semibold">Require CNIC for Withholding Tax</Label>
                          <p className="text-xs text-gray-600 mt-1">
                            Guest CNIC required for WHT deposit - enables advance tax claims
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={activeConfig.requiresCNIC}
                        onCheckedChange={(checked) => setActiveConfig({ 
                          ...activeConfig, 
                          requiresCNIC: checked 
                        })}
                        disabled={!isCreating && editingId !== activeConfig.id}
                      />
                    </div>

                    {activeConfig.requiresCNIC && (
                      <div className="mt-3 bg-white rounded-lg p-3 border border-orange-200 text-sm text-gray-700">
                        <p className="font-semibold mb-2">When CNIC is required:</p>
                        <ul className="text-xs space-y-1 list-disc list-inside ml-2">
                          <li>Reservation form will show CNIC field as mandatory</li>
                          <li>WHT deposited against guest's CNIC with tax authorities</li>
                          <li>Guest can claim advance tax using their CNIC</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Audit Trail */}
                  {!isCreating && (
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg p-4 border-2 border-gray-400">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <Shield className="size-4" />
                        Audit Trail
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white rounded p-3 border border-gray-300">
                          <span className="text-gray-500 text-xs">Status:</span>
                          <div className="mt-1">
                            <span
                              className={`px-3 py-1 rounded text-xs font-bold ${
                                activeConfig.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {activeConfig.isActive ? '● ACTIVE' : '○ INACTIVE'}
                            </span>
                          </div>
                        </div>
                        <div className="bg-white rounded p-3 border border-gray-300">
                          <span className="text-gray-500 text-xs">Created:</span>
                          <div className="font-semibold text-gray-900 mt-1">
                            {activeConfig.createdAt.toLocaleDateString()} by {activeConfig.createdBy}
                          </div>
                        </div>
                        {activeConfig.updatedAt && (
                          <div className="bg-white rounded p-3 border border-gray-300 col-span-2">
                            <span className="text-gray-500 text-xs">Last Updated:</span>
                            <div className="font-semibold text-gray-900 mt-1">
                              {activeConfig.updatedAt.toLocaleDateString()} by {activeConfig.updatedBy}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
