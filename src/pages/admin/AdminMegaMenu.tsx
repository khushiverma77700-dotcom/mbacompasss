import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronsUpDown } from "lucide-react";
import { useTableSort } from "@/hooks/useTableSort";
import SortableTableHead from "@/components/admin/SortableTableHead";

interface MenuRow {
  id: string;
  menu_type: string;
  tab_label: string;
  tab_sort_order: number;
  column_title: string;
  column_sort_order: number;
  link_label: string;
  link_url: string;
  link_sort_order: number;
  active: boolean;
}

const emptyRow: Omit<MenuRow, "id"> = {
  menu_type: "college",
  tab_label: "",
  tab_sort_order: 0,
  column_title: "",
  column_sort_order: 0,
  link_label: "",
  link_url: "",
  link_sort_order: 0,
  active: true,
};

// Dropdown + free-text combo input
const ComboInput = ({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10 text-sm">
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search or type new..."
          className="mb-2 h-8 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && search) {
              onChange(search);
              setSearch("");
              setOpen(false);
            }
          }}
        />
        <div className="max-h-40 overflow-y-auto space-y-0.5">
          {filtered.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setSearch(""); setOpen(false); }}
              className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                value === opt ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
              }`}
            >
              {opt}
            </button>
          ))}
          {filtered.length === 0 && search && (
            <button
              onClick={() => { onChange(search); setSearch(""); setOpen(false); }}
              className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted text-primary"
            >
              + Create "{search}"
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const AdminMegaMenu = () => {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState<string>("college");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuRow | null>(null);
  const [form, setForm] = useState<Omit<MenuRow, "id">>(emptyRow);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-mega-menu", filterType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mega_menu_items")
        .select("*")
        .eq("menu_type", filterType)
        .order("tab_sort_order")
        .order("column_sort_order")
        .order("link_sort_order");
      if (error) throw error;
      return data as MenuRow[];
    },
  });

  // Compute existing unique tab labels and column titles for dropdowns
  const { existingTabs, existingColumns } = useMemo(() => {
    const tabs = [...new Set(items.map((i: MenuRow) => i.tab_label).filter(Boolean))];
    const columns = [...new Set(items.map((i: MenuRow) => i.column_title).filter(Boolean))];
    return { existingTabs: tabs, existingColumns: columns };
  }, [items]);

  const { sortedItems: sortedMenuItems, sortConfig: menuSortConfig, handleSort: handleMenuSort } = useTableSort(items);

  const saveMut = useMutation({
    mutationFn: async (row: Omit<MenuRow, "id"> & { id?: string }) => {
      if (row.id) {
        const { error } = await supabase.from("mega_menu_items").update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mega_menu_items").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-mega-menu"] });
      qc.invalidateQueries({ queryKey: ["mega-menu"] });
      toast.success("Saved");
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mega_menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-mega-menu"] });
      qc.invalidateQueries({ queryKey: ["mega-menu"] });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyRow, menu_type: filterType });
    setDialogOpen(true);
  };

  const openEdit = (row: MenuRow) => {
    setEditing(row);
    setForm({ ...row });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.tab_label || !form.column_title || !form.link_label || !form.link_url) {
      toast.error("All fields are required");
      return;
    }
    saveMut.mutate(editing ? { ...form, id: editing.id } : form);
  };

  // Group items by tab for better visual
  const grouped = (menuSortConfig.direction ? sortedMenuItems : items).reduce<Record<string, MenuRow[]>>((acc, item) => {
    const key = item.tab_label;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mega Menu Manager</h1>
          <p className="text-sm text-muted-foreground">Manage navigation dropdown links for Colleges and Coaching menus</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Link</Button>
      </div>

      <div className="flex gap-2">
        <Button variant={filterType === "college" ? "default" : "outline"} onClick={() => setFilterType("college")}>
          College Menu
        </Button>
        <Button variant={filterType === "coaching" ? "default" : "outline"} onClick={() => setFilterType("coaching")}>
          Coaching Menu
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([tab, rows]) => (
            <div key={tab} className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b border-border">
                <h3 className="font-semibold text-sm text-foreground">Tab: {tab}</h3>
              </div>
              <Table>
                <TableHeader>
                   <TableRow>
                     <SortableTableHead label="Column" sortKey="column_title" sortConfig={menuSortConfig} onSort={handleMenuSort} className="w-36" />
                     <SortableTableHead label="Link Label" sortKey="link_label" sortConfig={menuSortConfig} onSort={handleMenuSort} />
                     <SortableTableHead label="URL" sortKey="link_url" sortConfig={menuSortConfig} onSort={handleMenuSort} />
                     <SortableTableHead label="Order" sortKey="link_sort_order" sortConfig={menuSortConfig} onSort={handleMenuSort} className="w-16" />
                     <SortableTableHead label="Active" sortKey="active" sortConfig={menuSortConfig} onSort={handleMenuSort} className="w-16" />
                     <TableHead className="w-24">Actions</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-medium">{row.column_title}</TableCell>
                      <TableCell>{row.link_label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-48 truncate">{row.link_url}</TableCell>
                      <TableCell className="text-xs">{row.link_sort_order}</TableCell>
                      <TableCell>
                        <span className={`w-2 h-2 rounded-full inline-block ${row.active ? "bg-green-500" : "bg-red-400"}`} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(row.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <p className="text-center text-muted-foreground py-8">No items yet. Click "Add Link" to get started.</p>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Menu Link" : "Add Menu Link"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Menu Type</Label>
                <Select value={form.menu_type} onValueChange={(v) => setForm({ ...form, menu_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="coaching">Coaching</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Active</Label>
                <div className="pt-2">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tab Label</Label>
                <ComboInput
                  value={form.tab_label}
                  onChange={(v) => setForm({ ...form, tab_label: v })}
                  options={existingTabs}
                  placeholder="e.g. IIMs"
                />
              </div>
              <div>
                <Label>Tab Sort Order</Label>
                <Input type="number" value={form.tab_sort_order} onChange={(e) => setForm({ ...form, tab_sort_order: Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Column Title</Label>
                <ComboInput
                  value={form.column_title}
                  onChange={(v) => setForm({ ...form, column_title: v })}
                  options={existingColumns}
                  placeholder="e.g. Top IIMs"
                />
              </div>
              <div>
                <Label>Column Sort Order</Label>
                <Input type="number" value={form.column_sort_order} onChange={(e) => setForm({ ...form, column_sort_order: Number(e.target.value) })} />
              </div>
            </div>

            <div>
              <Label>Link Label</Label>
              <Input value={form.link_label} onChange={(e) => setForm({ ...form, link_label: e.target.value })} placeholder="e.g. IIM Ahmedabad" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Link URL</Label>
                <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/college/iim-ahmedabad" />
              </div>
              <div>
                <Label>Link Sort Order</Label>
                <Input type="number" value={form.link_sort_order} onChange={(e) => setForm({ ...form, link_sort_order: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMegaMenu;
