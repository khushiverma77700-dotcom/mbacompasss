import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OverviewPanel from "@/components/admin/seo-engines/OverviewPanel";
import IntentPanel from "@/components/admin/seo-engines/IntentPanel";
import DecayPanel from "@/components/admin/seo-engines/DecayPanel";
import EntityPanel from "@/components/admin/seo-engines/EntityPanel";
import PipelinePanel from "@/components/admin/seo-engines/PipelinePanel";

const AdminSEOEngines = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">AI SEO Automation Suite</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Global health overview, Search Intent Splitting, Content Decay Recovery, Entity Stacking, and the
        automatic post-publish pipeline — all driven by live Search Console signals.
      </p>
    </div>

    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="overview">Health overview</TabsTrigger>
        <TabsTrigger value="intent">Intent splitting</TabsTrigger>
        <TabsTrigger value="decay">Decay recovery</TabsTrigger>
        <TabsTrigger value="entity">Entity stacking</TabsTrigger>
        <TabsTrigger value="pipeline">Signals &amp; pipeline</TabsTrigger>
      </TabsList>

      <TabsContent value="overview"><OverviewPanel /></TabsContent>
      <TabsContent value="intent"><IntentPanel /></TabsContent>
      <TabsContent value="decay"><DecayPanel /></TabsContent>
      <TabsContent value="entity"><EntityPanel /></TabsContent>
      <TabsContent value="pipeline"><PipelinePanel /></TabsContent>
    </Tabs>
  </div>
);

export default AdminSEOEngines;
