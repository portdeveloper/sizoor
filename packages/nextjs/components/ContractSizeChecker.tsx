"use client";

import { useState } from "react";
import { usePublicClient } from "wagmi";

interface ContractSizeData {
  size: number;
  percentageOfLimit: number;
  optimizationScore: number;
}

export const ContractSizeChecker = () => {
  const [contractAddress, setContractAddress] = useState<string>("");
  const [contractSize, setContractSize] = useState<ContractSizeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();

  const getContractSize = async (address: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!publicClient) {
        throw new Error("No public client found");
      }

      if (!address || address.length !== 42) {
        throw new Error("Please enter a valid Ethereum address");
      }

      const bytecode = await publicClient.getCode({ address: address as `0x${string}` });

      if (!bytecode || bytecode === "0x") {
        throw new Error("No contract found at this address");
      }

      // Remove "0x" prefix and calculate size in bytes, then convert to KB
      const sizeInBytes = (bytecode.length - 2) / 2;
      const sizeInKB = sizeInBytes / 1024;

      // Calculate percentage of limit (128KB max)
      const lowerLimit = 100; // 100KB
      const upperLimit = 128; // 128KB

      let percentageOfLimit = 0;
      let optimizationScore = 0;

      if (sizeInKB <= lowerLimit) {
        // Below lower limit - score based on how close to lower limit
        percentageOfLimit = (sizeInKB / upperLimit) * 100;

        // For very small contracts (< 5KB), give them at least 5% score
        // to make the visualization more visible
        if (sizeInKB < 5) {
          optimizationScore = 5 + (sizeInKB / 5) * 5; // 5-10% for tiny contracts
        } else if (sizeInKB < 20) {
          // For small contracts (5-20KB), score from 10-25%
          optimizationScore = 10 + ((sizeInKB - 5) / 15) * 15;
        } else {
          // For medium-small contracts (20-100KB), score from 25-78%
          optimizationScore = 25 + ((sizeInKB - 20) / 80) * 53;
        }
      } else if (sizeInKB <= upperLimit) {
        // Between limits - closer to upper limit is better
        const rangePosition = (sizeInKB - lowerLimit) / (upperLimit - lowerLimit);
        percentageOfLimit = (sizeInKB / upperLimit) * 100;
        // Scale from 78% to 100% for the 100-128KB range
        optimizationScore = 78 + rangePosition * 22;
      } else {
        // Above limit
        percentageOfLimit = 100;
        optimizationScore = 0; // Zero score if above limit
      }

      setContractSize({
        size: sizeInKB,
        percentageOfLimit,
        optimizationScore,
      });
    } catch (err: any) {
      setError(err.message || "Error fetching contract bytecode");
      setContractSize(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 10) return "text-red-500"; // Very tiny contracts
    if (score < 25) return "text-orange-500"; // Small contracts
    if (score < 50) return "text-yellow-500"; // Medium-small contracts
    if (score < 78) return "text-blue-500"; // Approaching optimal
    return "text-green-500"; // In optimal range
  };

  const getGradientClass = (score: number) => {
    if (contractSize && contractSize.size > 128) {
      return "bg-gradient-to-r from-red-500 to-red-700"; // Exceeded limit
    }

    if (score < 10) {
      return "bg-gradient-to-r from-red-400 to-red-300"; // Very tiny (< 5KB)
    }
    if (score < 25) {
      return "bg-gradient-to-r from-red-300 to-orange-400"; // Small (5-20KB)
    }
    if (score < 50) {
      return "bg-gradient-to-r from-orange-400 to-yellow-500"; // Medium-small (20-50KB)
    }
    if (score < 78) {
      return "bg-gradient-to-r from-yellow-500 to-blue-500"; // Approaching optimal (50-100KB)
    }
    if (score < 90) {
      return "bg-gradient-to-r from-blue-500 to-green-500"; // Good (100-114KB)
    }
    return "bg-gradient-to-r from-green-500 to-emerald-600"; // Excellent (114-128KB)
  };

  return (
    <div className="bg-base-200 p-6 rounded-xl shadow-md w-full">
      <div className="flex flex-col space-y-4">
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

      {error && <div className="alert alert-error my-4">{error}</div>}

      {contractSize && (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="stat bg-base-100 rounded-box shadow">
              <div className="stat-title">Optimization Score</div>
              <div className={`stat-value ${getScoreColor(contractSize.optimizationScore)}`}>
                {contractSize.optimizationScore.toFixed(0)}%
              </div>
              <div className="stat-desc">Higher is better (within limit)</div>
            </div>
          </div>

          {/* Size visualization */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>0 KB</span>
              <span className="text-blue-500">100 KB</span>
              <span className="text-green-500">128 KB</span>
              <span>150 KB</span>
            </div>
            <div className="h-6 bg-base-100 rounded-full overflow-hidden w-full">
              {/* Background scale markers */}
              <div className="h-full w-full relative">
                <div className="absolute h-full w-[66.7%] border-r-2 border-blue-500"></div> {/* 100KB mark */}
                <div className="absolute h-full w-[85.3%] border-r-2 border-green-500"></div> {/* 128KB mark */}
                {/* Actual size bar */}
                <div
                  className={`h-full ${getGradientClass(contractSize.optimizationScore)}`}
                  style={{
                    width: `${Math.min((contractSize.size / 150) * 100, 100)}%`,
                    transition: "width 0.5s ease-in-out",
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="mt-6 bg-base-100 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Recommendation</h3>
            {contractSize.size > 128 && (
              <p className="text-red-500">
                Your contract exceeds the EVM size limit of 128KB. You need to optimize or split your contract.
              </p>
            )}
            {contractSize.size <= 128 && contractSize.size >= 100 && (
              <p className="text-green-500">
                Your contract is optimally sized! It&apos;s within the ideal range of 100-128KB, making efficient use of
                the contract size while staying under the limit.
                {contractSize.size >= 114 && (
                  <span className="block mt-1 font-semibold">
                    Excellent optimization: Your contract is very close to the maximum efficient size, but you can still
                    add more functionality while staying under the limit.
                  </span>
                )}
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

      {!contractSize && !error && !isLoading && (
        <div className="text-center py-8">
          <p className="text-lg opacity-70">
            Enter a contract address to check its size and optimization relative to the EVM limits.
          </p>
          <div className="mt-6 opacity-70">
            <div className="text-center mb-2">Optimization Scale (0-128KB):</div>
            <div className="flex justify-center items-center gap-1">
              <div className="text-xs text-center w-10">
                &lt;5KB
                <br />
                (Tiny)
              </div>
              <div className="w-10 h-4 bg-gradient-to-r from-red-400 to-red-300 rounded"></div>
              <div className="w-10 h-4 bg-gradient-to-r from-red-300 to-orange-400 rounded"></div>
              <div className="w-12 h-4 bg-gradient-to-r from-orange-400 to-yellow-500 rounded"></div>
              <div className="w-14 h-4 bg-gradient-to-r from-yellow-500 to-blue-500 rounded"></div>
              <div className="w-14 h-4 bg-gradient-to-r from-blue-500 to-green-500 rounded"></div>
              <div className="w-14 h-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded"></div>
              <div className="text-xs text-center w-10">
                128KB
                <br />
                (Max)
              </div>
            </div>
            <div className="flex justify-center items-center gap-1 mt-1">
              <div className="text-xs w-10"></div>
              <div className="text-xs text-center w-10">5KB</div>
              <div className="text-xs text-center w-10">20KB</div>
              <div className="text-xs text-center w-12">50KB</div>
              <div className="text-xs text-center w-14">100KB</div>
              <div className="text-xs text-center w-14">114KB</div>
              <div className="text-xs text-center w-14"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
