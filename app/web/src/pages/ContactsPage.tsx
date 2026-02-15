import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";
import { qk } from "../lib/queryKeys";
import type { PaginatedContacts } from "../lib/dto";
import { formatApiError } from "../lib/errors";
import ContactsTable from "../components/ContactsTable";
import FilterPanel from "../components/FilterPanel";

export default function ContactsPage() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();

  const paramsObj = Object.fromEntries(sp.entries());

  const { data, isLoading, error } = useQuery({
    queryKey: qk.contacts(paramsObj),
    queryFn: () => apiGet<PaginatedContacts>(`/contacts?${sp.toString()}`),
  });

  return (
    <div>
      <h2>Contacts</h2>
      <FilterPanel searchParams={sp} setSearchParams={setSp} />
      {error ? <div style={{ color: "crimson" }}>{formatApiError(error)}</div> : null}
      <ContactsTable
        rows={data?.data ?? []}
        sort={{ key: "name", order: "asc" }}
        onSortChange={() => {}}
        onRowClick={(id) => nav(`/contacts/${id}`)}
        isLoading={isLoading}
      />
    </div>
  );
}
