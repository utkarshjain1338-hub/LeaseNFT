"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TransactionFeed } from "@/components/TransactionFeed";
import { Activity, History } from "lucide-react";

export default function ActivityPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Activity</h1>
        <p className="text-muted-foreground mt-1">
          Real-time contract events and transaction history
        </p>
      </div>

      <Tabs defaultValue="feed" className="space-y-6">
        <TabsList>
          <TabsTrigger value="feed" className="gap-2">
            <Activity className="h-4 w-4" />
            Event Feed
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Transaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <ActivityFeed />
        </TabsContent>

        <TabsContent value="history">
          <TransactionFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
}
