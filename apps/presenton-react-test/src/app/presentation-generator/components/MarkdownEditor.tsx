import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content,
    editorProps: {
      attributes: {
        class: "outline-none transition-all duration-200",
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = editor.storage.markdown.getMarkdown();
      onChange(markdown);
    },
    immediatelyRender: false,
  });

  // // If you need to sync external updates (streaming), uncomment:
  // useEffect(() => {
  //   if (editor && content !== editor.storage.markdown.getMarkdown()) {
  //     editor.commands.setContent(content);
  //   }
  // }, [content, editor]);

  return (
    <div className="relative">
      <EditorContent
        className="text-sm sm:text-base outline-none resize-none min-h-[60px] prose prose-sm max-w-none"
        editor={editor}
      />
    </div>
  );
};

export default MarkdownEditor;
