import React, { useState, useEffect } from 'react';
import zipcodes from 'zipcodes-ph';

export default function PhAddressSelector({ value, onChange }) {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [loading, setLoading] = useState({
    region: true,
    province: false,
    city: false,
    barangay: false
  });

  // Fetch all regions on mount
  useEffect(() => {
    fetch('/data/psgc/regions.json')
      .then(res => res.json())
      .then(data => {
        // Sort by name
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setRegions(sorted);
        setLoading(prev => ({ ...prev, region: false }));
      })
      .catch(err => {
        console.error('Error fetching regions:', err);
        setLoading(prev => ({ ...prev, region: false }));
      });
  }, []);

  // When region changes, fetch provinces (or cities if NCR)
  useEffect(() => {
    if (!value.regionCode) {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
      return;
    }

    setLoading(prev => ({ ...prev, province: true, city: true }));
    
    // Check if NCR (code: 130000000 or 1300000000)
    if (value.regionCode === '130000000' || value.regionCode === '1300000000') {
      // NCR has no provinces, it has districts. But practically, people skip to cities.
      setProvinces([{ code: 'NCR', name: 'Metro Manila' }]);
      onChange('province', 'Metro Manila');
      onChange('provinceCode', 'NCR');
      
      fetch(`/data/psgc/region-${value.regionCode}-cities.json`)
        .then(res => res.json())
        .then(data => {
          setCities(data.sort((a, b) => a.name.localeCompare(b.name)));
          setLoading(prev => ({ ...prev, province: false, city: false }));
        })
        .catch(err => {
          console.error(err);
          setLoading(prev => ({ ...prev, province: false, city: false }));
        });
    } else {
      fetch(`/data/psgc/region-${value.regionCode}-provinces.json`)
        .then(res => res.json())
        .then(data => {
          setProvinces(data.sort((a, b) => a.name.localeCompare(b.name)));
          setCities([]);
          setBarangays([]);
          setLoading(prev => ({ ...prev, province: false, city: false }));
        })
        .catch(err => {
          console.error(err);
          setLoading(prev => ({ ...prev, province: false, city: false }));
        });
    }
  }, [value.regionCode]);

  // When province changes, fetch cities
  useEffect(() => {
    if (!value.provinceCode || value.provinceCode === 'NCR') {
      return; // Handled by NCR logic above
    }

    setLoading(prev => ({ ...prev, city: true }));
    fetch(`/data/psgc/province-${value.provinceCode}-cities.json`)
      .then(res => res.json())
      .then(data => {
        setCities(data.sort((a, b) => a.name.localeCompare(b.name)));
        setBarangays([]);
        setLoading(prev => ({ ...prev, city: false }));
      })
      .catch(err => {
        console.error(err);
        setLoading(prev => ({ ...prev, city: false }));
      });
  }, [value.provinceCode]);

  // When city changes, fetch barangays and attempt to auto-fill postal code
  useEffect(() => {
    if (!value.cityCode) {
      setBarangays([]);
      return;
    }

    // Auto-fill postal code using zipcodes-ph
    if (value.city) {
      try {
        // Zipcodes-ph find function expects a city name
        const found = zipcodes.find(value.city);
        if (found && found.length > 0) {
          // Attempt to match province if possible, or just take the first match
          const match = value.province ? found.find(z => z.province.toLowerCase() === value.province.toLowerCase()) || found[0] : found[0];
          if (match && match.zipcode) {
            onChange('postalCode', match.zipcode);
          }
        }
      } catch (err) {
        console.error('Zipcode find error:', err);
      }
    }

    setLoading(prev => ({ ...prev, barangay: true }));
    fetch(`/data/psgc/city-${value.cityCode}-barangays.json`)
      .then(res => res.json())
      .then(data => {
        setBarangays(data.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(prev => ({ ...prev, barangay: false }));
      })
      .catch(err => {
        console.error(err);
        setLoading(prev => ({ ...prev, barangay: false }));
      });
  }, [value.cityCode]);


  const handleChange = (field, e) => {
    const selectedOptions = e.target.selectedOptions;
    if (!selectedOptions || selectedOptions.length === 0) {
      onChange(field, e.target.value);
      return;
    }

    const code = selectedOptions[0].getAttribute('data-code');
    const name = selectedOptions[0].text;

    // Reset downstream fields when a higher level changes
    if (field === 'region') {
      onChange('region', name);
      onChange('regionCode', code);
      onChange('province', '');
      onChange('provinceCode', '');
      onChange('city', '');
      onChange('cityCode', '');
      onChange('barangay', '');
      onChange('barangayCode', '');
      onChange('postalCode', '');
    } else if (field === 'province') {
      onChange('province', name);
      onChange('provinceCode', code);
      onChange('city', '');
      onChange('cityCode', '');
      onChange('barangay', '');
      onChange('barangayCode', '');
      onChange('postalCode', '');
    } else if (field === 'city') {
      onChange('city', name);
      onChange('cityCode', code);
      onChange('barangay', '');
      onChange('barangayCode', '');
    } else if (field === 'barangay') {
      onChange('barangay', name);
      onChange('barangayCode', code);
    } else {
      onChange(field, e.target.value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">Region *</label>
          <select
            name="region"
            required
            value={value.regionCode || ''}
            onChange={(e) => handleChange('region', e)}
            className="w-full px-4 py-2.5 bg-surface text-on-surface rounded-xl border border-outline-variant focus:border-vibrant-orange focus:ring-1 focus:ring-vibrant-orange outline-none transition-all text-sm"
          >
            <option value="" disabled>
              {loading.region ? 'Loading...' : 'Select Region'}
            </option>
            {regions.map((reg) => (
              <option key={reg.code} value={reg.code} data-code={reg.code}>
                {reg.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">Province *</label>
          <select
            name="province"
            required
            value={value.provinceCode || ''}
            onChange={(e) => handleChange('province', e)}
            disabled={!value.regionCode || loading.province || value.provinceCode === 'NCR'}
            className="w-full px-4 py-2.5 bg-surface text-on-surface rounded-xl border border-outline-variant focus:border-vibrant-orange focus:ring-1 focus:ring-vibrant-orange outline-none transition-all text-sm disabled:opacity-50"
          >
            <option value="" disabled>
              {loading.province ? 'Loading...' : 'Select Province'}
            </option>
            {provinces.map((prov) => (
              <option key={prov.code} value={prov.code} data-code={prov.code}>
                {prov.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">City / Municipality *</label>
          <select
            name="city"
            required
            value={value.cityCode || ''}
            onChange={(e) => handleChange('city', e)}
            disabled={!value.provinceCode || loading.city}
            className="w-full px-4 py-2.5 bg-surface text-on-surface rounded-xl border border-outline-variant focus:border-vibrant-orange focus:ring-1 focus:ring-vibrant-orange outline-none transition-all text-sm disabled:opacity-50"
          >
            <option value="" disabled>
              {loading.city ? 'Loading...' : 'Select City / Municipality'}
            </option>
            {cities.map((city) => (
              <option key={city.code} value={city.code} data-code={city.code}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">Postal Code *</label>
          <input
            type="text"
            name="postalCode"
            required
            placeholder="e.g. 1000"
            value={value.postalCode || ''}
            onChange={(e) => onChange('postalCode', e.target.value)}
            className="w-full px-4 py-2.5 bg-surface text-on-surface rounded-xl border border-outline-variant focus:border-vibrant-orange focus:ring-1 focus:ring-vibrant-orange outline-none transition-all text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">Barangay *</label>
          <select
            name="barangay"
            required
            value={value.barangayCode || ''}
            onChange={(e) => handleChange('barangay', e)}
            disabled={!value.cityCode || loading.barangay}
            className="w-full px-4 py-2.5 bg-surface text-on-surface rounded-xl border border-outline-variant focus:border-vibrant-orange focus:ring-1 focus:ring-vibrant-orange outline-none transition-all text-sm disabled:opacity-50"
          >
            <option value="" disabled>
              {loading.barangay ? 'Loading...' : 'Select Barangay'}
            </option>
            {barangays.map((brgy) => (
              <option key={brgy.code} value={brgy.code} data-code={brgy.code}>
                {brgy.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface">Building / House No. & Street *</label>
          <input
            type="text"
            name="street"
            required
            placeholder="e.g. 123 Rizal St."
            value={value.street || ''}
            onChange={(e) => onChange('street', e.target.value)}
            className="w-full px-4 py-2.5 bg-surface text-on-surface rounded-xl border border-outline-variant focus:border-vibrant-orange focus:ring-1 focus:ring-vibrant-orange outline-none transition-all text-sm"
          />
        </div>
      </div>
    </div>
  );
}
