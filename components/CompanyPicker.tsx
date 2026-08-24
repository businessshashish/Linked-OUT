"use client";

import { useState } from "react";

type CompanyOption = {
  id: string;
  name: string;
};

export default function CompanyPicker({
  companies,
  name = "companyId",
  selectedId = "",
  required = false
}: {
  companies: CompanyOption[];
  name?: string;
  selectedId?: string;
  required?: boolean;
}) {
  const selectedCompany = companies.find((company) => company.id === selectedId);
  const [query, setQuery] = useState(selectedCompany?.name || "");
  const [selected, setSelected] = useState(selectedId);
  const [isOpen, setIsOpen] = useState(false);

  const matches = query.trim()
    ? companies.filter((company) => company.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12)
    : companies.slice(0, 12);

  function chooseCompany(company: CompanyOption) {
    setQuery(company.name);
    setSelected(company.id);
    setIsOpen(false);
  }

  return (
    <div className="companyPicker">
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected("");
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
        placeholder="Search companies..."
        autoComplete="off"
        aria-label="Search companies"
        required={required && !selected}
      />
      <input type="hidden" name={name} value={selected} />
      {isOpen && (
        <div className="companyPickerResults" role="listbox">
          {matches.length ? (
            matches.map((company) => (
              <button type="button" key={company.id} onClick={() => chooseCompany(company)}>
                {company.name}
              </button>
            ))
          ) : (
            <span className="companyPickerEmpty">No companies found</span>
          )}
        </div>
      )}
    </div>
  );
}
