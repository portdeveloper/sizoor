"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Address } from "./scaffold-eth";
import { usePublicClient } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

interface ContractSizeData {
  size: number;
  percentageOfLimit: number;
}

interface HistoryItem {
  address: string;
  data: ContractSizeData;
  timestamp: number;
}

export const ContractSizeChecker = () => {
  const [contractAddress, setContractAddress] = useState<string>("");
  const [contractSize, setContractSize] = useState<ContractSizeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [imageScale, setImageScale] = useState<number>(0);
  const [showAnimation, setShowAnimation] = useState<boolean>(false);

  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });

  // Load history from local storage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("contractSizeHistory");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history from localStorage");
      }
    }
  }, []);

  // Save history to local storage whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("contractSizeHistory", JSON.stringify(history));
    }
  }, [history]);

  // Animation effect when contract size changes
  useEffect(() => {
    if (contractSize) {
      setShowAnimation(true);
      // Start with a tiny scale
      setImageScale(0.1);

      // Gradually increase the scale to the target value
      const targetScale = calculateImageScale(contractSize.size);
      const steps = 80; // Increased from 30 to 60 steps
      const increment = (targetScale - 0.1) / steps;

      let step = 0;
      const interval = setInterval(() => {
        if (step < steps) {
          setImageScale(prev => prev + increment);
          step++;
        } else {
          clearInterval(interval);
        }
      }, 50); // Increased from 40ms to 50ms per step (~3 seconds total animation)

      return () => clearInterval(interval);
    }
  }, [contractSize]);

  const getContractSize = async (address: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("publicClient", publicClient);
      if (!publicClient) {
        throw new Error("No public client found");
      }

      if (!address || address.length !== 42) {
        throw new Error("Please enter a valid EVM address");
      }

      const bytecode = await publicClient.getCode({ address: address as `0x${string}` });

      if (!bytecode || bytecode === "0x") {
        throw new Error("No contract found at this address");
      }

      // Remove "0x" prefix and calculate size in bytes, then convert to KB
      const sizeInBytes = (bytecode.length - 2) / 2;
      const sizeInKB = sizeInBytes / 1024;

      // Calculate percentage of limit (128KB max)
      const upperLimit = 128; // 128KB
      const percentageOfLimit = (sizeInKB / upperLimit) * 100;

      const sizeData = {
        size: sizeInKB,
        percentageOfLimit,
      };

      setContractSize(sizeData);

      // Add to history (avoiding duplicates)
      const historyItem = {
        address,
        data: sizeData,
        timestamp: Date.now(),
      };

      setHistory(prev => {
        // Check if address already exists in history
        const existingIndex = prev.findIndex(item => item.address.toLowerCase() === address.toLowerCase());
        if (existingIndex >= 0) {
          // Update existing item
          const newHistory = [...prev];
          newHistory[existingIndex] = historyItem;
          return newHistory;
        } else {
          // Add new item (limit to 10 most recent)
          return [historyItem, ...prev].slice(0, 10);
        }
      });
    } catch (err: any) {
      setError(err.message || "Error fetching contract bytecode");
      setContractSize(null);
      setShowAnimation(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setContractAddress(item.address);
    setContractSize(item.data);
    setError(null);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("contractSizeHistory");
  };

  const getGradientClass = (size: number) => {
    if (size > 128) {
      return "bg-gradient-to-r from-red-500 to-red-700"; // Exceeded limit
    }

    if (size < 5) {
      return "bg-gradient-to-r from-red-400 to-red-300"; // Very tiny (< 5KB)
    }
    if (size < 20) {
      return "bg-gradient-to-r from-red-300 to-orange-400"; // Small (5-20KB)
    }
    if (size < 50) {
      return "bg-gradient-to-r from-orange-400 to-yellow-500"; // Medium-small (20-50KB)
    }
    if (size < 100) {
      return "bg-gradient-to-r from-yellow-500 to-blue-500"; // Approaching optimal (50-100KB)
    }
    if (size < 114) {
      return "bg-gradient-to-r from-blue-500 to-green-500"; // Good (100-114KB)
    }
    return "bg-gradient-to-r from-green-500 to-emerald-600"; // Excellent (114-128KB)
  };

  // Calculate image scale based on contract size
  const calculateImageScale = (size: number) => {
    if (!size) return 0;

    // Start with a small base size for tiny contracts
    if (size < 5) return 0.1 + (size / 5) * 0.1; // 0.1-0.2 scale for <5KB
    if (size < 20) return 0.2 + ((size - 5) / 15) * 0.2; // 0.2-0.4 scale for 5-20KB
    if (size < 50) return 0.4 + ((size - 20) / 30) * 0.3; // 0.4-0.7 scale for 20-50KB
    if (size < 100) return 0.7 + ((size - 50) / 50) * 0.3; // 0.7-1.0 scale for 50-100KB
    if (size <= 114) return 2.5 + ((size - 100) / 14) * 0.5; // 2.5-3.0 scale for 100-114KB
    if (size <= 128) return 3.0 + ((size - 114) / 14) * 1.0; // 3.0-4.0 scale for 114-128KB
    return 4.5; // Even larger for oversized contracts
  };

  return (
    <div className="bg-base-200 p-6 rounded-xl w-full relative overflow-hidden">
      {/* Background image that grows with contract size */}
      {showAnimation && (
        <div className="fixed inset-0 flex items-center justify-center opacity-50 pointer-events-none overflow-hidden z-0">
          <div
            className="transition-transform duration-300 ease-out"
            style={{
              transform: `scale(${imageScale})`,
              width: "100%",
              height: "100%",
              position: "relative",
            }}
          >
            <Image
              src="/MolandakHD.png"
              alt="Size visualization"
              fill
              sizes="100vw"
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-4 relative z-10">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Enter contract address (0x...)"
            value={contractAddress}
            onChange={e => setContractAddress(e.target.value)}
            className="input input-bordered w-full"
          />
          <button
            className="btn btn-primary whitespace-nowrap"
            onClick={() => getContractSize(contractAddress)}
            disabled={isLoading}
          >
            {isLoading ? "Checking..." : "Check Size"}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error my-4 relative z-10">{error}</div>}

      {contractSize && (
        <div className="space-y-6 mt-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-title">Contract Size</div>
              <div className="stat-value">{contractSize.size.toFixed(2)} KB</div>
              <div className="stat-desc">
                {contractSize.size > 128
                  ? "Exceeds limit!"
                  : contractSize.size < 100
                    ? "Below optimal range"
                    : "Within optimal range"}
              </div>
            </div>

            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-title">Percentage</div>
              <div className="stat-value">{contractSize.percentageOfLimit.toFixed(1)}%</div>
              <div className="stat-desc">128KB</div>
            </div>
          </div>

          {/* Size visualization */}
          <div className="space-y-2">
            <div className="flex relative text-sm">
              <span>0 KB</span>
              <span className="text-blue-500 absolute left-[78.125%] transform -translate-x-1/2">100 KB</span>
              <span className="text-green-500 absolute right-0">128 KB</span>
            </div>
            <div className="h-6 bg-base-100 rounded-sm overflow-hidden w-full">
              {/* Background scale markers */}
              <div className="h-full w-full relative">
                <div className="absolute h-full w-[78.125%] border-r-2 border-blue-500"></div> {/* 100KB mark */}
                <div className="absolute h-full w-full border-r-2 border-green-500"></div> {/* 128KB mark */}
                {/* Actual size bar */}
                <div
                  className={`h-full ${getGradientClass(contractSize.size)}`}
                  style={{
                    width: `${contractSize.percentageOfLimit}%`,
                    transition: "width 0.5s ease-in-out",
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="mt-6 bg-base-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Recommendation</h3>
            {contractSize.size <= 128 && contractSize.size >= 100 && (
              <p className="text-green-500">
                Your contract is optimally sized! It&apos;s within the ideal range of 100-128KB.
              </p>
            )}
            {contractSize.size < 100 && (
              <div
                className={
                  contractSize.size < 5 ? "text-red-500" : contractSize.size < 20 ? "text-orange-500" : "text-blue-500"
                }
              >
                {contractSize.size < 5 && (
                  <>
                    This contract is extremely smol ({contractSize.size.toFixed(2)}KB)!
                    <ul className="list-disc ml-6 mt-2 text-sm"></ul>
                  </>
                )}
                {contractSize.size >= 5 && contractSize.size < 20 && (
                  <>
                    Your contract is quite smol ({contractSize.size.toFixed(2)}KB). There&apos;s significant room to add
                    more functionality while staying well below the 128KB limit.
                  </>
                )}
                {contractSize.size >= 20 && (
                  <>
                    Your contract is smaller than the optimal range ({contractSize.size.toFixed(2)}KB vs 100-128KB). You
                    could add more features while still staying under the 128KB limit.
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <div className="mt-8 bg-base-100 p-4 rounded-lg relative z-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">History</h3>
            <button onClick={clearHistory} className="btn btn-sm btn-outline btn-error">
              Clear History
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-compact w-full">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Size</th>
                  <th>Percentage</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.address} className="hover">
                    <td className="font-mono text-xs truncate max-w-[170px]">
                      <Address address={item.address} />
                    </td>
                    <td>{item.data.size.toFixed(2)} KB</td>
                    <td>{item.data.percentageOfLimit.toFixed(1)}%</td>
                    <td>
                      <button onClick={() => loadFromHistory(item)} className="btn btn-xs btn-secondary">
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
