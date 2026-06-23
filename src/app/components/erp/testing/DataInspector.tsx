import { useState } from 'react';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog';
import { Eye, Copy, CheckCircle2 } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { venueDataStore, primeSpaceDataStore, subSpaceDataStore, layoutDataStore } from '../../../lib/masterDataStore';

export function DataInspector() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const getData = () => {
    return {
      venues: venueDataStore.getVenues([]),
      primeSpaces: primeSpaceDataStore.getPrimeSpaces([]),
      subSpaces: subSpaceDataStore.getSubSpaces([]),
      layouts: layoutDataStore.getLayouts([]),
    };
  };

  const copyToClipboard = () => {
    const data = getData();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const data = getData();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 left-6 z-50 shadow-lg bg-gray-700 text-white hover:bg-gray-800 border-gray-600"
        >
          <Eye className="size-4 mr-2" />
          Inspect Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="size-5 text-gray-600" />
            Data Inspector
          </DialogTitle>
          <DialogDescription>
            View current data stored in localStorage
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Badge variant="secondary">{data.venues.length} Venues</Badge>
              <Badge variant="secondary">{data.primeSpaces.length} Prime Spaces</Badge>
              <Badge variant="secondary">{data.subSpaces.length} Sub Spaces</Badge>
              <Badge variant="secondary">{data.layouts.length} Layouts</Badge>
            </div>
            <Button
              onClick={copyToClipboard}
              size="sm"
              variant="outline"
              disabled={copied}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="size-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="size-4 mr-2" />
                  Copy JSON
                </>
              )}
            </Button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[500px] overflow-auto">
            <pre className="text-xs text-gray-800 font-mono">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>

          {data.venues.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                📝 No data found. Use the Testing Control Panel to generate sample data.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
