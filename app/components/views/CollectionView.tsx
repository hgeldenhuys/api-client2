import React from "react";
import { CollectionExplorer } from "~/components/CollectionExplorer";
import { RequestBuilder } from "~/components/RequestBuilder";
import { ResponseViewer } from "~/components/ResponseViewer";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";

export function CollectionView() {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel
        defaultSize={20}
        minSize={15}
        maxSize={30}
        className="bg-sidebar"
      >
        <div className="h-full overflow-hidden">
          <CollectionExplorer />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50} minSize={30}>
        <div className="h-full overflow-hidden">
          <RequestBuilder />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
        <div className="h-full overflow-hidden">
          <ResponseViewer />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
