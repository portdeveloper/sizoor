"use client";

import { ContractSizeChecker } from "../components/ContractSizeChecker";
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5 w-full max-w-3xl">
          <h1 className="text-center mb-6 text-4xl font-bold">Contract Size Checker</h1>
          <p className="text-center mb-10 text-lg">
            Visualize your smart contract size relative to the 100-128kb limit range
          </p>
          <ContractSizeChecker />
        </div>
      </div>
    </>
  );
};

export default Home;
