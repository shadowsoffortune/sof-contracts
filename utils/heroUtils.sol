library HeroUtils {
    function calculateHeroEXPL(uint256 PER, uint256 INT, uint256 AGI) internal pure returns (uint256) {
        return PER + INT / 2 + AGI / 4;
    }
    function calculateHeroFurtivity(uint256 AGI, uint256 PER, uint256 INT) internal pure returns (uint256) {
        return AGI + PER / 2 + INT / 2;
    }
}