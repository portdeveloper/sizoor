"use client";

import { useState } from "react";
import Image from "next/image";
import { ContractSizeChecker } from "../components/ContractSizeChecker";
import type { NextPage } from "next";

const Home: NextPage = () => {
  const [logoLoaded, setLogoLoaded] = useState<boolean>(false);

  return (
    <>
      <div className="flex items-center justify-center flex-col flex-grow pt-10">
        <div className="px-5 w-full max-w-3xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div
              className={`transition-all duration-1000 ${logoLoaded ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
            >
              <Image
                src="/crazy-contract-logo.png"
                alt="Crazy Contract"
                width={400}
                height={200}
                className="h-auto"
                priority
                onLoad={() => setLogoLoaded(true)}
              />
            </div>
          </div>

          <p className="text-center mb-10 text-lg">
            Check if your contract is ready for{" "}
            <a
              href="https://x.com/monad_dev/status/1907077431241920719"
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              the Crazy Contract Mission
            </a>
            !
          </p>

          <ContractSizeChecker />
        </div>
      </div>
    </>
  );
};

export default Home;
