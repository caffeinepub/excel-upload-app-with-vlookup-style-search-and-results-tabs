import { Principal } from "@dfinity/principal";
import { Loader2 } from "lucide-react";
import React, { useCallback } from "react";
import { useApproval } from "../../hooks/useApproval";
import {
  useDeleteDirectMessage,
  useGetDirectMessages,
  useSendDirectMessage,
} from "../../hooks/useTeamMessaging";
import MessageFeed from "./MessageFeed";
import MessageInput from "./MessageInput";

interface DirectMessageViewProps {
  otherPrincipal: string;
  callerPrincipal: string;
}

export default function DirectMessageView({
  otherPrincipal,
  callerPrincipal,
}: DirectMessageViewProps) {
  const { data: messages = [], isLoading } =
    useGetDirectMessages(otherPrincipal);
  const sendDm = useSendDirectMessage();
  const deleteMessage = useDeleteDirectMessage();
  const { isAdmin } = useApproval();

  const handleSend = async (
    text: string,
    fileUrl?: string,
    fileName?: string,
  ) => {
    await sendDm.mutateAsync({
      toPrincipal: Principal.fromText(otherPrincipal),
      text,
      fileUrl: fileUrl ?? null,
      fileName: fileName ?? null,
    });
  };

  const handleDelete = useCallback(
    (messageId: bigint) => {
      deleteMessage.mutate({ otherPrincipalStr: otherPrincipal, messageId });
    },
    [otherPrincipal, deleteMessage],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <MessageFeed
          messages={messages}
          callerPrincipal={callerPrincipal}
          isAdmin={isAdmin}
          onDeleteMessage={handleDelete}
        />
      )}
      <MessageInput onSend={handleSend} placeholder="Send a message…" />
    </div>
  );
}
