import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setCanChangeKeys, setLLMConfig } from "../store/slices/userConfig";
// import { hasValidLLMConfig } from "./utils/storeHelpers";
import { hasValidLLMConfig } from "../utils/storeHelpers";
import { checkIfSelectedOllamaModelIsPulled } from "../utils/providerUtils";
import { LLMConfig } from "../types/llm_config";

interface Props {
  children: React.ReactNode;
}

export const ConfigurationInitializer: React.FC<Props> = ({ children }) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);

  // Detect current route without next/navigation
  const route = window.location.pathname;

  useEffect(() => {
    fetchUserConfigState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = (path: string) => {
    window.location.href = path;
  };

  const setLoadingToFalseAfterNavigatingTo = (pathname: string) => {
    const interval = setInterval(() => {
      if (window.location.pathname === pathname) {
        clearInterval(interval);
        setIsLoading(false);
      }
    }, 400);
  };

  const fetchUserConfigState = async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/can-change-keys");
      const canChangeKeys = (await response.json()).canChange;
      dispatch(setCanChangeKeys(canChangeKeys));

      if (canChangeKeys) {
        const configResponse = await fetch("/api/user-config");
        const llmConfig: LLMConfig = await configResponse.json();

        if (!llmConfig.LLM) llmConfig.LLM = "openai";
        dispatch(setLLMConfig(llmConfig));

        const isValid = hasValidLLMConfig(llmConfig);

        if (isValid) {
          if (llmConfig.LLM === "ollama") {
            const isPulled = await checkIfSelectedOllamaModelIsPulled(
              llmConfig.OLLAMA_MODEL
            );
            if (!isPulled) {
              navigate("/");
              setLoadingToFalseAfterNavigatingTo("/");
              return;
            }
          }

          if (llmConfig.LLM === "custom") {
            const available = await checkIfSelectedCustomModelIsAvailable(
              llmConfig
            );
            if (!available) {
              navigate("/");
              setLoadingToFalseAfterNavigatingTo("/");
              return;
            }
          }

          if (route === "/") {
            navigate("/upload");
            setLoadingToFalseAfterNavigatingTo("/upload");
          } else {
            setIsLoading(false);
          }
        } else if (route !== "/") {
          navigate("/");
          setLoadingToFalseAfterNavigatingTo("/");
        } else {
          setIsLoading(false);
        }
      } else {
        if (route === "/") {
          navigate("/upload");
          setLoadingToFalseAfterNavigatingTo("/upload");
        } else {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Error loading configuration:", error);
      setIsLoading(false);
    }
  };

  const checkIfSelectedCustomModelIsAvailable = async (
    llmConfig: LLMConfig
  ) => {
    try {
      const response = await fetch(
        "/api/v1/ppt/openai/models/available",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: llmConfig.CUSTOM_LLM_URL,
            api_key: llmConfig.CUSTOM_LLM_API_KEY,
          }),
        }
      );
      const data: string[] = await response.json();
      return data.includes(llmConfig.CUSTOM_MODEL);
    } catch (e) {
      console.error("Error fetching custom models:", e);
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E9E8F8] via-[#F5F4FF] to-[#E0DFF7] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
            <div className="mb-6">
              <img
                src="/Logo.png"
                alt="PresentOn"
                className="h-12 mx-auto mb-4 opacity-90"
              />
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded-full"></div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800 font-inter">
                Initializing Application
              </h3>
              <p className="text-sm text-gray-600 font-inter">
                Loading configuration and checking model availability...
              </p>
            </div>

            <div className="mt-6">
              <div className="flex space-x-1 justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <div
                  className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
