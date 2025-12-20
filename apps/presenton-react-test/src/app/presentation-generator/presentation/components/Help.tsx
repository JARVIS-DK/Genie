import React, { useState, useEffect, useRef } from "react";
import { HelpCircle, X, Search } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../../components/ui/accordion";

type FAQ = {
  id: number;
  category: string;
  question: string;
  answer: string;
};

const helpQuestions: FAQ[] = [
  {
    id: 1,
    category: "Images",
    question: "How do I change an image?",
    answer:
      "Click on any image to reveal the image toolbar. You'll see options to Edit, Adjust position, and change how the image fits within its container. The Edit option allows you to replace or modify the current image.",
  },
  {
    id: 2,
    category: "Images",
    question: "Can I generate new images with AI?",
    answer:
      "Yes! Click on any image and select the Edit option from the toolbar. In the side panel that appears, you'll find the AI Generate tab. Enter your prompt describing the image you want, and our AI will generate an image based on your description.",
  },
  {
    id: 3,
    category: "Images",
    question: "How do I upload my own images?",
    answer:
      "Click on any image, then select Edit from the toolbar. In the side panel, click on the Upload tab at the top. You can browse your files to select one. Once uploaded, you can apply it to your design.",
  },
  {
    id: 11,
    category: "AI Prompts",
    question: "Can I change slide layout through prompt?",
    answer:
      "Yes you can! Click on the WandSparkles icon on the top left of each slide and it will give you a prompt input box. Describe your layout requirements and the AI will change the slide layout accordingly.",
  },
  {
    id: 12,
    category: "AI Prompts",
    question: "Can I change slide image through prompt?",
    answer:
      "Yes you can! Click on the WandSparkles icon on the top left of each slide and it will give you a prompt input box. Describe the image you want and the AI will update the slide image based on your requirements.",
  },
  {
    id: 14,
    category: "AI Prompts",
    question: "Can I change content through prompt?",
    answer:
      "Yes you can! Click on the WandSparkles icon on the top left of each slide and it will give you a prompt input box. Describe what content you want and the AI will update the slide's text and content based on your description.",
  },
  {
    id: 4,
    category: "Text",
    question: "How can I format and highlight text?",
    answer:
      "Select any text to see the formatting toolbar appear. You'll have options for Bold, Italic, Underline, Strikethrough, and more.",
  },
  {
    id: 5,
    category: "Icons",
    question: "How do I change icons?",
    answer:
      "Click on any existing icon to modify it. In the icon selector panel, you can browse icons or use the search function to find specific icons. We offer thousands of icons in various styles.",
  },
  {
    id: 16,
    category: "Layout",
    question: "Can I change the position of slide?",
    answer:
      "Of course, On side panel you can drag the slide and place wherever you want.",
  },
  {
    id: 15,
    category: "Layout",
    question: "Can I add new slide between the slide?",
    answer:
      "Yes you can just click on the plus icon below each slide. It will display all the layouts and choose required one.",
  },
  {
    id: 6,
    category: "Layout",
    question: "Can I add more sections to my slides?",
    answer:
      "Absolutely! Hover near the bottom of any text box or content block, and you'll see a + icon appear. Click this button to add a new section.",
  },
  {
    id: 8,
    category: "Export",
    question: "How do I download or export my presentation?",
    answer:
      "Click the Export button in the top right menu. You can choose to download as PDF or PowerPoint.",
  },
];

const Help: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredQuestions, setFilteredQuestions] = useState<FAQ[]>(helpQuestions);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const modalRef = useRef<HTMLDivElement>(null);

  // Build category list
  useEffect(() => {
    const unique = Array.from(new Set(helpQuestions.map(q => q.category)));
    setCategories(["All", ...unique]);
  }, []);

  // Handle search + filtering
  useEffect(() => {
    let results = helpQuestions;

    if (selectedCategory !== "All") {
      results = results.filter(q => q.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        faq =>
          faq.question.toLowerCase().includes(q) ||
          faq.answer.toLowerCase().includes(q)
      );
    }

    setFilteredQuestions(results);
  }, [searchQuery, selectedCategory]);

  // Close modal when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest(".help-button")
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const modalClass = isOpen
    ? "opacity-100 scale-100"
    : "opacity-0 scale-95 pointer-events-none";

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="help-button hidden fixed bottom-6 right-6 h-12 w-12 z-50 bg-emerald-600 hover:bg-emerald-700 rounded-full md:flex justify-center items-center cursor-pointer shadow-lg transition-all duration-300 hover:shadow-xl"
        aria-label="Help Center"
      >
        {isOpen ? <X className="text-white h-5 w-5" /> : <HelpCircle className="text-white h-5 w-5" />}
      </button>

      {/* Pop-up Modal */}
      <div
        ref={modalRef}
        className={`fixed bottom-20 right-6 z-50 max-w-md w-full transition-all duration-300 transform ${modalClass}`}
      >
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-emerald-600 text-white px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-medium">Help Center</h2>
            <button onClick={() => setIsOpen(false)} className="hover:bg-emerald-700 p-1 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="px-6 pt-4 pb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search help topics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Category Pills */}
          <div className="px-6 pb-3 flex gap-2 overflow-x-auto hide-scrollbar">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto px-6 pb-6">
            {filteredQuestions.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {filteredQuestions.map((faq, index) => (
                  <AccordionItem key={faq.id} value={`item-${index}`} className="border-b border-gray-200">
                    <AccordionTrigger className="py-3 px-1 text-left flex">
                      <div className="flex-1 pr-2">
                        <span className="text-gray-900 font-medium text-sm md:text-base">{faq.question}</span>
                        <span className="block text-xs text-emerald-600">{faq.category}</span>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-1 pb-3">
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md leading-relaxed">
                        {faq.answer}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <p>No results found for "{searchQuery}"</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                  className="text-emerald-600 hover:underline text-sm mt-2"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-3 text-xs text-center text-gray-500 border-t">
            Still need help?{" "}
            <a href="/contact" className="text-emerald-600 hover:underline">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Help;
