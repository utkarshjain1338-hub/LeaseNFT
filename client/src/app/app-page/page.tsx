"use client";

import { Contract } from "@/components/Contract";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code } from "lucide-react";

export default function AppPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">LeaseNFT App</h1>
        <p className="text-muted-foreground mt-1">
          Interact with the LeaseNFT smart contract
        </p>
      </div>

      <Tabs defaultValue="interact" className="space-y-6">
        <TabsList>
          <TabsTrigger value="interact">Contract Interaction</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="interact">
          <Contract />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
}
