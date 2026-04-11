import { useState, useEffect, useRef } from 'react'

function CustomSelect({ options, value, onChange, placeholder = '请选择', multiple = false, getOptionLabel = (opt) => opt, getOptionValue = (opt) => opt }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getCurrentValueArray = () => {
    if (Array.isArray(value)) {
      return value
    } else if (typeof value === 'string' && value) {
      return value.split(', ').filter(Boolean)
    }
    return []
  }

  const handleSelect = (option) => {
    if (multiple) {
      const currentArray = getCurrentValueArray()
      const optionValue = getOptionValue(option)
      
      let newArray
      if (currentArray.includes(optionValue)) {
        newArray = currentArray.filter(v => v !== optionValue)
      } else {
        newArray = [...currentArray, optionValue]
      }
      onChange(newArray)
    } else {
      onChange(getOptionValue(option))
      setIsOpen(false)
    }
  }

  const handleSelectAll = () => {
    if (!multiple) return
    
    const currentArray = getCurrentValueArray()
    const allOptionValues = options.map(opt => getOptionValue(opt))
    
    if (currentArray.length === allOptionValues.length) {
      onChange([])
    } else {
      onChange(allOptionValues)
    }
  }

  const getSelectedLabel = () => {
    if (multiple) {
      const currentArray = getCurrentValueArray()
      if (currentArray.length > 0) {
        const selectedOptions = options.filter(opt => currentArray.includes(getOptionValue(opt)))
        return selectedOptions.map(opt => getOptionLabel(opt)).join(', ')
      }
      return placeholder
    } else {
      const selectedOption = options.find(opt => getOptionValue(opt) === value)
      return selectedOption ? getOptionLabel(selectedOption) : placeholder
    }
  }

  const isSelected = (option) => {
    const optionValue = getOptionValue(option)
    if (multiple) {
      const currentArray = getCurrentValueArray()
      return currentArray.includes(optionValue)
    } else {
      return optionValue === value
    }
  }

  const isAllSelected = () => {
    if (!multiple || options.length === 0) return false
    const currentArray = getCurrentValueArray()
    const allOptionValues = options.map(opt => getOptionValue(opt))
    return currentArray.length === allOptionValues.length
  }

  return (
    <div className="custom-select" ref={dropdownRef}>
      <div 
        className="custom-select-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className={(value && (Array.isArray(value) ? value.length > 0 : value)) ? '' : 'placeholder'}>
          {getSelectedLabel()}
        </span>
        <span className={`arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      {isOpen && (
        <div className="custom-select-dropdown">
          {multiple && options.length > 0 && (
            <div 
              className="custom-select-option select-all-option"
              onClick={handleSelectAll}
            >
              {isAllSelected() ? '取消全选' : '全选'}
            </div>
          )}
          <div className="custom-select-options">
            {options.map((option, index) => (
              <div
                key={index}
                className={`custom-select-option ${isSelected(option) ? 'selected' : ''}`}
                onClick={() => handleSelect(option)}
              >
                {getOptionLabel(option)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomSelect
