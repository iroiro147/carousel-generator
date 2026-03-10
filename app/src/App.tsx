import { Routes, Route } from 'react-router-dom'
import BriefIntake from './screens/BriefIntake'
import ThemeConfirmation from './screens/ThemeConfirmation'
import CoverVariants from './screens/CoverVariants'
import Editor from './screens/Editor'

export default function App() {
  return (
    <div className="font-sans">
      <Routes>
        <Route path="/" element={<BriefIntake />} />
        <Route path="/theme-confirmation" element={<ThemeConfirmation />} />
        <Route path="/cover-variants" element={<CoverVariants />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </div>
  )
}
