import React from 'react';
import { Box } from '@mui/material';

interface MMLogoProps {
  size?: 'small' | 'medium' | 'large' | number;
  sx?: any;
}

const MMLogo: React.FC<MMLogoProps> = ({ size = 'medium', sx }) => {
  // Convert size to pixel values
  const getSizeValue = (): number => {
    if (typeof size === 'number') {
      return size;
    }

    switch (size) {
      case 'small':
        return 60;
      case 'medium':
        return 120;
      case 'large':
        return 200;
      default:
        return 120;
    }
  };

  const sizeValue = getSizeValue();

  return (
    <Box
      component="img"
      src="/temporarylogo/owlrkrita2.png"
      alt="MortgageMate Logo"
      sx={{
        width: sizeValue,
        height: sizeValue,
        objectFit: 'contain',
        ...sx
      }}
    />
  );
};

export default MMLogo;
